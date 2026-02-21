import { Directive } from './If';

export const ComponentDirective: Directive = {
    name: 'component',
    handle(content: string): string {
        if (content.startsWith('@component')) {
            // @component('name', { optionalData: true })
            const match = content.match(/@component\(['"]?(.*?)['"]?(?:,\s*(.*?))?\)/);
            const name = match?.[1] || '';
            const dataStr = match?.[2] || '{}';
            return `_engine.startComponent('${name}', ${dataStr}, _output);\n_output = '';\n`;
        }
        if (content === '@endcomponent') {
            return `_output = await _engine.renderComponent(_output);\n`;
        }
        return '';
    }
};
