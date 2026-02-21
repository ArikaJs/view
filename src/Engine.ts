import * as fs from 'node:fs';
import * as path from 'node:path';
import { Compiler } from './Compiler';
import { Template } from './Template';

export interface ViewConfig {
    viewsPath: string;
    cachePath?: string;
    extension?: string;
    cache?: boolean;
}

export class Engine {
    private sections: Record<string, string> = {};
    private sectionStack: { name: string, previousOutput: string }[] = [];
    private parentTemplate: string | null = null;
    private compiler: Compiler;
    private templateLoader: Template;
    private compiledFunctions: Map<string, Function> = new Map();

    private sharedData: Record<string, any> = {};

    // For push & stack
    private pushes: Record<string, string[]> = {};
    private pushStack: { name: string, previousOutput: string }[] = [];

    // For components & slots
    private componentStack: { name: string, data: any, previousOutput: string, slots: Record<string, string> }[] = [];
    private slotStack: { name: string, previousOutput: string }[] = [];

    constructor(private config: ViewConfig) {
        this.compiler = new Compiler();
        this.templateLoader = new Template(config);
    }

    /**
     * Share data across all renders.
     */
    public share(key: string, value: any): void {
        this.sharedData[key] = value;
    }

    /**
     * Add a custom directive to the template compiler.
     */
    public addDirective(directive: any): void {
        this.compiler.addDirective(directive);
    }

    /**
     * Render a template file.
     */
    public async render(template: string, data: Record<string, any> = {}, isInternal = false): Promise<string> {
        if (!isInternal) {
            this.sections = {};
            this.pushes = {}; // Reset pushes for top-level render
        }

        const mergedData = { ...this.sharedData, ...data };
        this.parentTemplate = null;

        const content = await this.renderTemplate(template, mergedData);

        if (this.parentTemplate) {
            const parent = this.parentTemplate;
            this.parentTemplate = null;
            return this.render(parent, data, true);
        }

        return content;
    }

    /**
     * Internal render logic.
     */
    private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
        // 1. Check In-Memory Cache
        if (this.config.cache && this.compiledFunctions.has(templateName)) {
            return await this.compiledFunctions.get(templateName)!(this, data);
        }

        const cacheFile = this.config.cachePath
            ? path.join(this.config.cachePath, templateName.replace(/[\.\/\\]/g, '_') + '.js')
            : null;

        let jsCode: string | null = null;

        // 2. Check Disk Cache
        if (this.config.cache && cacheFile && fs.existsSync(cacheFile)) {
            try {
                jsCode = fs.readFileSync(cacheFile, 'utf8');
            } catch (e) {
                // Fail silently and recompile
            }
        }

        // 3. Compile if not found in cache
        if (!jsCode) {
            const rawContent = this.templateLoader.read(templateName);
            jsCode = this.compiler.compile(rawContent);

            // Save to Disk Cache
            if (this.config.cache && cacheFile) {
                try {
                    if (!fs.existsSync(this.config.cachePath!)) {
                        fs.mkdirSync(this.config.cachePath!, { recursive: true });
                    }
                    fs.writeFileSync(cacheFile, jsCode);
                } catch (e) {
                    console.error(`View Cache Warning: Failed to write to ${this.config.cachePath}`);
                }
            }
        }

        // 4. Create Function and Save to Memory Cache
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
        const renderFunc = new AsyncFunction('_engine', '_data', jsCode);

        if (this.config.cache) {
            this.compiledFunctions.set(templateName, renderFunc);
        }

        try {
            return await renderFunc(this, data);
        } catch (e: any) {
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

    // --- PUSH & STACK ---

    public startPush(name: string, previousOutput: string): void {
        this.pushStack.push({ name, previousOutput });
    }

    public endPush(content: string): string {
        const push = this.pushStack.pop();
        if (push) {
            if (!this.pushes[push.name]) {
                this.pushes[push.name] = [];
            }
            this.pushes[push.name].push(content);
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
            // Assign slot content to the current active component
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
            // Render the component template internally
            const componentData = {
                ...component.data,
                slot: defaultSlotContent, // The default {{ slot }}
                ...component.slots // Named slots like {{ title }}
            };
            const rendered = await this.render(component.name, componentData, true);
            // Restore the output state from before the component started and append rendered result
            return component.previousOutput + rendered;
        }
        return defaultSlotContent;
    }
}
