export const SectionDirective = {
    name: 'section',
    handle(content: string): string {
        if (content.startsWith('@section')) {
            const match = content.match(/@section\s*\(([^)]*)\)/);
            const name = match && match[1] ? match[1].replace(/['"]/g, '') : '';
            return `_engine.startSection("${name}", _output);\n_output = "";\n`;
        }
        if (content === '@endsection') {
            return `_output = _engine.popSection(_output);\n`;
        }
        if (content.startsWith('@yield')) {
            const match = content.match(/@yield\s*\(([^)]*)\)/);
            const name = match && match[1] ? match[1] : '""';
            return `_output += _engine.yield(${name});\n`;
        }
        if (content.startsWith('@extends')) {
            const match = content.match(/@extends\s*\((.*)\)/);
            const parent = match && match[1] ? match[1] : '""';
            return `_engine.extend(${parent});\n`;
        }
        return '';
    }
};
