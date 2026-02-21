import { Directive } from './If';

export const PushDirective: Directive = {
    name: 'push',
    handle(content: string): string {
        if (content.startsWith('@push')) {
            const name = content.match(/@push\(['"]?(.*?)['"]?\)/)?.[1] || '';
            return `_engine.startPush('${name}', _output);\n_output = '';\n`;
        }
        if (content === '@endpush') {
            return `_output = _engine.endPush(_output);\n`;
        }
        return '';
    }
};
