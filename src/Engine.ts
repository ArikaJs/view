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

    constructor(private config: ViewConfig) {
        this.compiler = new Compiler();
        this.templateLoader = new Template(config);
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
        }

        this.parentTemplate = null;
        const content = await this.renderTemplate(template, data);

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
        if (this.config.cache && this.compiledFunctions.has(templateName)) {
            const cachedFunc = this.compiledFunctions.get(templateName)!;
            return await cachedFunc(this, data);
        }

        const rawContent = this.templateLoader.read(templateName);
        const jsCode = this.compiler.compile(rawContent);

        // Execute the compiled JS
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
}
