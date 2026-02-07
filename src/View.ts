import { Engine, ViewConfig } from './Engine';

export class View {
    private engine: Engine;

    constructor(config: ViewConfig) {
        this.engine = new Engine(config);
    }

    /**
     * Add a custom directive to the template compiler.
     */
    public addDirective(directive: any): void {
        this.engine.addDirective(directive);
    }

    /**
     * Render a template with data.
     */
    public async render(template: string, data: Record<string, any> = {}): Promise<string> {
        return this.engine.render(template, data);
    }
}
