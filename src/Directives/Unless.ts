import { Directive } from './If';

export const UnlessDirective: Directive = {
    name: 'unless',
    handle(content: string): string {
        if (content.startsWith('@unless')) {
            const expression = content.match(/@unless\s*\((.*)\)/)?.[1] || 'false';
            return `if (!(${expression})) {\n`;
        }
        if (content === '@endunless') {
            return `}\n`;
        }
        return '';
    }
};
