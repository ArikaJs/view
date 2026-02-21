import { Directive, IfDirective } from './Directives/If';
import { ForDirective } from './Directives/For';
import { IncludeDirective } from './Directives/Include';
import { SectionDirective } from './Directives/Section';
import { PushDirective } from './Directives/Push';
import { StackDirective } from './Directives/Stack';
import { ComponentDirective } from './Directives/Component';
import { SlotDirective } from './Directives/Slot';
import { UnlessDirective } from './Directives/Unless';
import { EmptyDirective } from './Directives/Empty';

export class Compiler {
    private directives: Directive[] = [
        IfDirective,
        ForDirective,
        IncludeDirective,
        SectionDirective,
        PushDirective,
        StackDirective,
        ComponentDirective,
        SlotDirective,
        UnlessDirective,
        EmptyDirective
    ];

    /**
     * Add a custom directive to the compiler.
     */
    public addDirective(directive: Directive): void {
        this.directives.unshift(directive);
    }

    /**
     * Compile a template string into a executable JavaScript function body.
     */
    public compile(content: string): string {
        let jsCode = 'let _output = "";\n';
        jsCode += 'const _escape = (val) => String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;");\n';
        jsCode += 'with (_data) {\n';

        const escapedContent = content
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${');

        const regex = /(@\w+\s*\(.*?\)|@\w+|\{\{.*?\}\}|\{!!.*?!!\})/sg;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(escapedContent)) !== null) {
            const text = escapedContent.substring(lastIndex, match.index);
            if (text) {
                jsCode += `_output += \`${text}\`;\n`;
            }

            const tag = match[0];

            if (tag.startsWith('{!!')) {
                const expr = tag.substring(3, tag.length - 3).trim().replace(/\\\\/g, '\\');
                jsCode += `_output += (${expr});\n`;
            } else if (tag.startsWith('{{')) {
                const expr = tag.substring(2, tag.length - 2).trim().replace(/\\\\/g, '\\');
                jsCode += `_output += _escape(${expr});\n`;
            } else if (tag.startsWith('@')) {
                let processed = false;
                for (const directive of this.directives) {
                    const result = directive.handle(tag);
                    if (result) {
                        jsCode += result;
                        processed = true;
                        break;
                    }
                }

                if (!processed) {
                    // If no directive handled it, treat as literal (escaping the @)
                    jsCode += `_output += \`@\`;\n`;
                    regex.lastIndex = match.index + 1;
                }
            }

            lastIndex = regex.lastIndex;
        }

        const remaining = escapedContent.substring(lastIndex);
        if (remaining) {
            jsCode += `_output += \`${remaining}\`;\n`;
        }

        jsCode += '}\nreturn _output;';
        return jsCode;
    }
}
