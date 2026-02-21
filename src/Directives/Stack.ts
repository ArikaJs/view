import { Directive } from './If';

export const StackDirective: Directive = {
    name: 'stack',
    handle(content: string): string {
        if (content.startsWith('@stack')) {
            const name = content.match(/@stack\(['"]?(.*?)['"]?\)/)?.[1] || '';
            return `_output += _engine.stack('${name}');\n`;
        }
        return '';
    }
};
