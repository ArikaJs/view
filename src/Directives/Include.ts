export const IncludeDirective = {
    name: 'include',
    handle(content: string): string {
        if (!content.startsWith('@include')) {
            return '';
        }
        const match = content.match(/@include\s*\((.*)\)/);
        const template = match && match[1] ? match[1] : '""';
        return `_output += await _engine.render(${template}, _data);\n`;
    }
};
