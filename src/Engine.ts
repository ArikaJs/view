import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { Compiler } from './Compiler';
import { Template } from './Template';

export interface ViewConfig {
    viewsPath: string;
    cachePath?: string;
    extension?: string;
    cache?: boolean;
    dev?: boolean;
}

export type ViewComposer = (data: any) => Promise<void> | void;
export type ViewHelper = (...args: any[]) => any;

export class Engine {
    private sections: Record<string, string> = {};
    private sectionStack: { name: string, previousOutput: string }[] = [];
    private parentTemplate: string | null = null;
    private compiler: Compiler;
    private templateLoader: Template;
    private compiledFunctions: Map<string, { func: Function, hash: string }> = new Map();

    private sharedData: Record<string, any> = {};
    private composers: Map<string, ViewComposer[]> = new Map();
    private helpers: Record<string, ViewHelper> = {};

    // For push, prepend & stack
    private pushes: Record<string, string[]> = {};
    private pushStack: { name: string, type: 'push' | 'prepend', previousOutput: string }[] = [];

    // For components & slots
    private componentStack: { name: string, data: any, previousOutput: string, slots: Record<string, string> }[] = [];
    private slotStack: { name: string, previousOutput: string }[] = [];

    // For fragments
    private fragmentMode: string | null = null;

    // For once directive
    private onceKeys: Set<string> = new Set();

    constructor(private config: ViewConfig) {
        this.config = {
            cache: true,
            dev: false,
            extension: '.ark.html',
            ...config
        };
        this.compiler = new Compiler();
        this.templateLoader = new Template(this.config);
    }

    /**
     * Share data across all renders.
     */
    public share(key: string, value: any): void {
        this.sharedData[key] = value;
    }

    /**
     * Add a view composer.
     */
    public composer(template: string, callback: ViewComposer): void {
        if (!this.composers.has(template)) {
            this.composers.set(template, []);
        }
        this.composers.get(template)!.push(callback);
    }

    /**
     * Add a global helper.
     */
    public helper(name: string, callback: ViewHelper): void {
        this.helpers[name] = callback;
    }

    /**
     * Add a custom directive.
     */
    public directive(name: string, handler: (expression: string | null, children?: string) => string): void {
        this.compiler.addDirective(name, handler);
    }

    /**
     * Render a template file.
     */
    public async render<T = Record<string, any>>(template: string, data: T = {} as T, isInternal = false): Promise<string> {
        if (!isInternal) {
            this.sections = {};
            this.pushes = {};
            this.onceKeys = new Set();
        }

        const mergedData = { ...this.sharedData, ...this.helpers, ...data };

        // Execute composers
        await this.executeComposers(template, mergedData);
        if (this.composers.has('*')) {
            await this.executeComposers('*', mergedData);
        }

        this.parentTemplate = null;

        const content = await this.renderTemplate(template, mergedData);

        if (this.parentTemplate) {
            const parent = this.parentTemplate;
            this.parentTemplate = null;
            return this.render(parent, data as any, true);
        }

        return content;
    }

    /**
     * Render a fragment of a template.
     */
    public async renderFragment(template: string, fragment: string, data: any = {}): Promise<string> {
        this.fragmentMode = fragment;
        const result = await this.render(template, data);
        this.fragmentMode = null;
        return result;
    }

    private async executeComposers(template: string, data: any): Promise<void> {
        const callbacks = this.composers.get(template);
        if (callbacks) {
            for (const cb of callbacks) {
                await cb(data);
            }
        }
    }

    private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
        const rawContent = this.templateLoader.read(templateName);
        const contentHash = crypto.createHash('md5').update(rawContent).digest('hex');

        // Check Cache
        if (this.config.cache && this.compiledFunctions.has(templateName)) {
            const cached = this.compiledFunctions.get(templateName)!;
            if (cached.hash === contentHash) {
                return await this.runCompiled(cached.func, data, templateName);
            }
        }

        const jsCode = this.compiler.compile(rawContent);
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

        // Use 'with' only for data provided to function to allow pure JS expressions
        const wrappedJsCode = `with (_data) {\n${jsCode}\n}`;
        const renderFunc = new AsyncFunction('_engine', '_data', wrappedJsCode);

        if (this.config.cache) {
            this.compiledFunctions.set(templateName, { func: renderFunc, hash: contentHash });
        }

        return await this.runCompiled(renderFunc, data, templateName);
    }

    private async runCompiled(func: Function, data: any, templateName: string): Promise<string> {
        try {
            return await func(this, data);
        } catch (e: any) {
            if (this.config.dev) {
                // In dev mode, we could enhance the error further
                throw new Error(`Error in ${templateName}: ${e.message}\nStack: ${e.stack}`);
            }
            throw new Error(`Error rendering template "${templateName}": ${e.message}`);
        }
    }

    // Methods called from compiled templates

    public extend(parent: string): void {
        this.parentTemplate = parent;
    }

    public startSection(name: string, previousOutput: string): void {
        this.sectionStack.push({ name, previousOutput });
    }

    public popSection(content: string): string {
        const section = this.sectionStack.pop();
        if (section) {
            this.sections[section.name] = content;
            return section.previousOutput;
        }
        return content;
    }

    public yield(name: string): string {
        return this.sections[name] || '';
    }

    // --- PUSH, PREPEND & STACK ---

    public startPush(name: string, previousOutput: string): void {
        this.pushStack.push({ name, type: 'push', previousOutput });
    }

    public startPrepend(name: string, previousOutput: string): void {
        this.pushStack.push({ name, type: 'prepend', previousOutput });
    }

    public endPush(content: string): string {
        return this.processEndPush(content);
    }

    public endPrepend(content: string): string {
        return this.processEndPush(content);
    }

    private processEndPush(content: string): string {
        const push = this.pushStack.pop();
        if (push) {
            if (!this.pushes[push.name]) {
                this.pushes[push.name] = [];
            }
            if (push.type === 'prepend') {
                this.pushes[push.name].unshift(content);
            } else {
                this.pushes[push.name].push(content);
            }
            return push.previousOutput;
        }
        return content;
    }

    public stack(name: string): string {
        return this.pushes[name] ? this.pushes[name].join('\n') : '';
    }

    // --- COMPONENTS & SLOTS ---

    public startComponent(name: string, data: any, previousOutput: string): void {
        this.componentStack.push({ name, data, previousOutput, slots: {} });
    }

    public startSlot(name: string, previousOutput: string): void {
        this.slotStack.push({ name, previousOutput });
    }

    public endSlot(content: string): string {
        const slot = this.slotStack.pop();
        if (slot) {
            if (this.componentStack.length > 0) {
                const component = this.componentStack[this.componentStack.length - 1];
                component.slots[slot.name] = content;
            }
            return slot.previousOutput;
        }
        return content;
    }

    public async renderComponent(defaultSlotContent: string): Promise<string> {
        const component = this.componentStack.pop();
        if (component) {
            const componentData = {
                ...component.data,
                slot: defaultSlotContent,
                ...component.slots
            };
            const rendered = await this.render(component.name, componentData, true);
            return component.previousOutput + rendered;
        }
        return defaultSlotContent;
    }

    // --- ONCE ---
    public markOnce(id: string): void {
        this.onceKeys.add(id);
    }
    public hasOnce(id: string): boolean {
        return this.onceKeys.has(id);
    }

    // --- FRAGMENTS ---
    public isFragmentMode(): boolean {
        return this.fragmentMode !== null;
    }
    public getFragment(): string | null {
        return this.fragmentMode;
    }
}
