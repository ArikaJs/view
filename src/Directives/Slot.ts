import { Directive } from './If';

export const SlotDirective: Directive = {
    name: 'slot',
    handle(content: string): string {
        if (content.startsWith('@slot')) {
            const name = content.match(/@slot\(['"]?(.*?)['"]?\)/)?.[1] || '';
            return `_engine.startSlot('${name}', _output);\n_output = '';\n`;
        }
        if (content === '@endslot') {
            return `_output = _engine.endSlot(_output);\n`;
        }
        return '';
    }
};
