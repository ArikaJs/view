import { Directive } from './If';

export const EmptyDirective: Directive = {
    name: 'empty',
    handle(content: string): string {
        if (content.startsWith('@empty')) {
            const expression = content.match(/@empty\s*\((.*)\)/)?.[1] || 'false';
            // True if null, undefined, false, 0, "", or empty array/object
            return `
            {
                let _val = ${expression};
                let _isEmpty = !_val;
                if (typeof _val === 'object' && _val !== null) {
                    _isEmpty = Array.isArray(_val) ? _val.length === 0 : Object.keys(_val).length === 0;
                }
                if (_isEmpty) {\n`;
        }
        if (content === '@endempty') {
            return `}\n}\n`;
        }
        return '';
    }
};
