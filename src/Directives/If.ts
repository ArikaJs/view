export interface Directive {
    name: string;
    handle(content: string): string;
}

export const IfDirective: Directive = {
    name: 'if',
    handle(content: string): string {
        if (content.startsWith('@if')) {
            const match = content.match(/@if\s*\((.*)\)/);
            const condition = match && match[1] ? match[1] : 'true';
            return `if (${condition}) {\n`;
        }
        if (content === '@else') {
            return `} else {\n`;
        }
        if (content.startsWith('@elseif')) {
            const match = content.match(/@elseif\s*\((.*)\)/);
            const condition = match && match[1] ? match[1] : 'true';
            return `} else if (${condition}) {\n`;
        }
        if (content === '@endif') {
            return `}\n`;
        }
        return '';
    }
};
