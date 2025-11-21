
// Custom implementation of JSON to TOON (Token-Oriented Object Notation)
// TOON aims to minimize tokens by removing redundant syntax like braces, brackets, and quotes where possible.
// Updated to match standard TOON syntax: arrays with length notation, inline primitive arrays, explicit nulls.

export const convertToToon = (jsonString: string): string => {
    try {
        const data = JSON.parse(jsonString);
        return toToon(data, 0);
    } catch (error) {
        console.error("TOON conversion error:", error);
        throw new Error('Failed to convert to TOON');
    }
};

function toToon(data: any, indentLevel: number): string {
    const indent = '  '.repeat(indentLevel);

    if (data === null) {
        return 'null';
    }

    if (typeof data === 'boolean') {
        return data ? 'true' : 'false';
    }

    if (typeof data === 'number') {
        return data.toString();
    }

    if (typeof data === 'string') {
        // Check for reserved keywords or if it looks like a number
        if (data === 'true' || data === 'false' || data === 'null' || !isNaN(Number(data))) {
            return JSON.stringify(data);
        }

        // Remove quotes if the string doesn't contain special characters or spaces
        // Allow dots in strings (e.g. filenames, versions) without quotes if otherwise safe
        if (/^[a-zA-Z0-9_.]+$/.test(data)) {
            return data;
        }
        return JSON.stringify(data);
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';

        // Check if it's an array of primitives (simple list)
        const isSimple = data.every(item => typeof item !== 'object' || item === null);
        if (isSimple) {
            // Inline comma-separated values
            return data.map(item => toToon(item, 0)).join(',');
        }

        // Array of objects or mixed
        return data.map(item => {

            // If the item is an object, we need to handle the first line correctly
            // The first line of the object should be on the same line as the dash
            // But toToon for object returns a block.
            // We need to trim the leading indent from the first line of the object string
            // because the dash replaces the indentation.

            // Actually, toToon adds indentation to all lines.
            // We want:
            // - key: val
            //   key2: val

            // If we just prepend "- ", it works if we adjust indentation.
            // Let's strip the first level of indentation from the result of toToon(item, indentLevel + 1)
            // No, toToon(item, indentLevel + 1) will return:
            //   key: val
            //   key2: val
            // We want:
            //   - key: val
            //     key2: val

            // So we call toToon with indentLevel + 1, but for the first line we replace the indent with "- ".
            // Wait, standard TOON for object list items:
            // - key: val
            //   key2: val

            // If item is object:
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                const objStr = toToon(item, indentLevel + 1);
                // Replace the first indentation with "- "
                // The indentation is '  '.repeat(indentLevel + 1)
                const itemIndent = '  '.repeat(indentLevel + 1);
                // We want to replace the first occurrence of itemIndent with '  '.repeat(indentLevel) + '- '
                // But wait, '  '.repeat(indentLevel) + '- ' is same length as '  '.repeat(indentLevel + 1) ?
                // indentLevel=0 -> indent=''. itemIndent='  '. target='- '. Lengths: 2 vs 2. Correct.
                // indentLevel=1 -> indent='  '. itemIndent='    '. target='  - '. Lengths: 4 vs 4. Correct.

                // So we just replace the first `  ` with ` - `? No.
                // We replace the leading spaces of the first line.
                return objStr.replace(new RegExp('^' + itemIndent), indent + '- ');
            }

            // If item is primitive or array (mixed array?)
            return indent + '- ' + toToon(item, 0);
        }).join('\n');
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';

        return keys.map(key => {
            const value = data[key];
            const formattedKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : JSON.stringify(key);

            // Handle Arrays specially to add [length]
            if (Array.isArray(value)) {
                const lengthSuffix = `[${value.length}]`;

                // Check if simple array (inline)
                const isSimple = value.every(item => typeof item !== 'object' || item === null);
                if (isSimple) {
                    if (value.length === 0) return `${indent}${formattedKey}${lengthSuffix}: []`;
                    return `${indent}${formattedKey}${lengthSuffix}: ${toToon(value, 0)} `;
                }

                // Complex array
                if (value.length === 0) return `${indent}${formattedKey}${lengthSuffix}: []`;
                return `${indent}${formattedKey}${lengthSuffix}:\n${toToon(value, indentLevel + 1)}`;
            }

            if (typeof value === 'object' && value !== null) {
                // Nested object
                // If empty object
                if (Object.keys(value).length === 0) return `${indent}${formattedKey}: { } `;
                return `${indent}${formattedKey}: \n${toToon(value, indentLevel + 1)} `;
            }

            return `${indent}${formattedKey}: ${toToon(value, 0)} `;
        }).join('\n');
    }

    return String(data);
}

export const convertToJson = (toonString: string): string => {
    try {
        const lines = toonString.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return '{}';

        const root: any = {};
        // Stack stores: { obj: container, indent: indentation_level, key: current_key_being_filled }
        // For array items, key is undefined.
        const stack: { obj: any, indent: number, key?: string }[] = [{ obj: root, indent: -1 }];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const indent = line.search(/\S/);
            const content = line.trim();

            // Find parent
            // Find parent
            while (stack.length > 1) {
                const top = stack[stack.length - 1];
                if (top.indent < indent) break;
                // If same indent, check if it's an array item continuing the array
                if (top.indent === indent && Array.isArray(top.obj) && content.startsWith('- ')) break;
                stack.pop();
            }
            const parent = stack[stack.length - 1];

            if (content.startsWith('- ')) {
                // Array item in a list
                const valueStr = content.substring(2).trim();

                // Parent must be an array. If not (e.g. root), we might need to handle it, but usually parent.obj is the array.
                // If parent.obj is an object and we have a key, we might be starting an array?
                // But the previous line "key[N]:" should have created the array.

                if (!Array.isArray(parent.obj)) {
                    // This usually happens if we are at root and it's a list
                    if (parent.indent === -1 && Object.keys(parent.obj).length === 0) {
                        // Convert root to array
                        const newRoot: any[] = [];
                        stack[0].obj = newRoot;
                        parent.obj = newRoot;
                    }
                }

                if (valueStr === '') {
                    // Object in array (starts with "- " and continues on next lines)
                    // Or empty item? 
                    // Usually "- key: val" is how objects start in TOON list if compact.
                    // But if it's "- ", it expects nested keys on next lines with higher indent?

                    // Let's assume it's a new object container
                    const newContainer = {};
                    if (Array.isArray(parent.obj)) {
                        parent.obj.push(newContainer);
                    }
                    // The indent of this item is `indent`. Children will have `indent + 2` (approx).
                    // We push this container to stack.
                    stack.push({ obj: newContainer, indent: indent, key: undefined });
                } else {
                    // Could be "- key: val" (object start) or "- value" (primitive)
                    // Check for key-value pair
                    const colonIndex = valueStr.indexOf(':');
                    // Ensure colon is not inside quotes
                    // Simple check:
                    let isKeyValue = false;
                    if (colonIndex !== -1) {
                        const keyPart = valueStr.substring(0, colonIndex);
                        // If keyPart has no spaces or is quoted, likely a key.
                        if (/^["']?[\w\d_]+["']?$/.test(keyPart) || /^"[^"]+"$/.test(keyPart)) {
                            isKeyValue = true;
                        }
                    }

                    if (isKeyValue) {
                        // It's an object starting on this line
                        const newContainer = {};
                        if (Array.isArray(parent.obj)) {
                            parent.obj.push(newContainer);
                        }
                        stack.push({ obj: newContainer, indent: indent, key: undefined });

                        // Process this line as a key-value pair inside the new container
                        // We can recurse or just process it here.
                        // Let's process it here.
                        const key = valueStr.substring(0, colonIndex).trim();
                        const valStr = valueStr.substring(colonIndex + 1).trim();

                        // Clean key (remove [N])
                        const cleanKey = key.replace(/\[\d+\]$/, '').replace(/^["']|["']$/g, '');

                        processValue(newContainer, cleanKey, valStr, indent + 2, stack, lines, i); // indent+2 is a guess, effectively it's inside this block
                    } else {
                        // Primitive value
                        const value = parseValue(valueStr);
                        if (Array.isArray(parent.obj)) {
                            parent.obj.push(value);
                        }
                    }
                }
            } else {
                // Key-value pair
                const colonIndex = content.indexOf(':');
                if (colonIndex === -1) {
                    // Maybe just a value? Invalid in object context.
                    continue;
                }

                const key = content.substring(0, colonIndex).trim();
                let valueStr = content.substring(colonIndex + 1).trim();

                // Clean key: remove [N] suffix if present
                const cleanKey = key.replace(/\[\d+\]$/, '');
                // Remove quotes from key if present
                const finalKey = cleanKey.startsWith('"') && cleanKey.endsWith('"') ? JSON.parse(cleanKey) : cleanKey;

                processValue(parent.obj, finalKey, valueStr, indent, stack, lines, i);
            }
        }

        return JSON.stringify(stack[0].obj, null, 2);
    } catch (error) {
        console.error("JSON conversion error:", error);
        throw new Error('Failed to convert to JSON');
    }
};

function processValue(container: any, key: string, valueStr: string, indent: number, stack: any[], lines: string[], currentIndex: number) {
    if (valueStr === '') {
        // Nested object or array (defined on next lines)
        // We need to peek ahead to see if it's an array (starts with "- ")
        // But we can just create an empty object, and if we encounter "- " children, we convert it to array?
        // Or better: check the key. If it had [N], it's likely an array.
        // But we stripped [N].
        // Let's check the next line.
        let isNextArray = false;
        if (currentIndex + 1 < lines.length) {
            const nextLine = lines[currentIndex + 1];
            const nextIndent = nextLine.search(/\S/);
            // Allow same indent if it starts with "- " (compact list)
            if (nextIndent >= indent && nextLine.trim().startsWith('- ')) {
                isNextArray = true;
            }
        }

        const newContainer = isNextArray ? [] : {};
        container[key] = newContainer;
        stack.push({ obj: newContainer, indent: indent, key: key });
    } else {
        // Value present
        // Check if it's an inline array (comma separated)
        // But wait, strings can have commas.
        // Primitive arrays in TOON are comma separated.
        // If it looks like a list of values...
        // Heuristic: if it contains commas and the values look like primitives.

        // Also check for empty array []
        if (valueStr === '[]') {
            container[key] = [];
            return;
        }
        if (valueStr === '{}') {
            container[key] = {};
            return;
        }

        // Try to split by comma, but respect quotes?
        // For simplicity, let's assume if it has commas and isn't a quoted string, it's an array.
        // Or if the key had [N], it IS an array.
        // But we don't have the raw key here easily unless we pass it.
        // Let's use the valueStr.

        const isQuoted = (valueStr.startsWith('"') && valueStr.endsWith('"')) || (valueStr.startsWith("'") && valueStr.endsWith("'"));

        if (valueStr.includes(',')) {
            // Check if it's a single quoted string that happens to contain a comma
            // e.g. "Hello, world"
            // If it is quoted, we try to see if the quotes cover the whole string.
            // But "a","b" also starts and ends with quotes.

            let isSingleString = false;
            if (isQuoted) {
                // Try to parse as JSON. If it parses, it's a single string.
                // But "a","b" is NOT valid JSON.
                try {
                    JSON.parse(valueStr);
                    isSingleString = true;
                } catch (e) {
                    isSingleString = false;
                }
            }

            if (isSingleString) {
                container[key] = parseValue(valueStr);
            } else {
                // Likely an inline array
                const parts = splitByComma(valueStr);
                const values = parts.map(parseValue);
                container[key] = values;
            }
        } else {
            container[key] = parseValue(valueStr);
        }
    }
}

function parseValue(valueStr: string): any {
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (valueStr === 'null') return null;
    if (valueStr === '[]') return [];
    if (valueStr === '{}') return {};

    // Number
    if (!isNaN(Number(valueStr)) && !valueStr.startsWith('"') && !valueStr.startsWith("'") && valueStr !== '') {
        return Number(valueStr);
    }

    // String (remove quotes if present)
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
        try {
            // Use JSON.parse to correctly handle escaped characters for double quotes
            if (valueStr.startsWith('"')) {
                return JSON.parse(valueStr);
            }
            // For single quotes, we still need to strip them, but JSON.parse doesn't support single quotes
            return valueStr.substring(1, valueStr.length - 1);
        } catch (e) {
            // Fallback if parse fails (shouldn't happen for valid JSON strings)
            return valueStr.substring(1, valueStr.length - 1);
        }
    }

    return valueStr;
}

function splitByComma(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuote = false;
            }
        }

        if (char === ',' && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

export const validateToon = (toonString: string): boolean => {
    const lines = toonString.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;

        // Check indentation (must be multiple of 2 spaces)
        const indent = line.search(/\S/);
        if (indent === -1) continue; // Should be covered by trim check but safe
        if (indent % 2 !== 0) return false;

        const content = line.trim();

        // Line must be an array item or have a key-value pair
        if (!content.startsWith('- ') && !content.includes(':')) {
            return false;
        }
    }
    return true;
};

