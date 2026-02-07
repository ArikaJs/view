export const ForDirective = {
    name: 'for',
    handle(content: string): string {
        if (content.startsWith('@for')) {
            const match = content.match(/@for\s*\((.*)\)/);
            const loop = match && match[1] ? match[1] : '';
            return `for (let ${loop}) {\n`;
        }
        if (content === '@endfor') {
            return `}\n`;
        }
        return '';
    }
};
