// Custom implementation of JSON to TOON (Token-Oriented Object Notation)
// TOON aims to minimize tokens by removing redundant syntax like braces, brackets, and quotes where possible.

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
        if (/^[a-zA-Z0-9_]+$/.test(data)) {
            return data;
        }
        return JSON.stringify(data);
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';

        // Check if it's an array of primitives (simple list)
        const isSimple = data.every(item => typeof item !== 'object' || item === null);
        if (isSimple) {
            return data.map(item => toToon(item, 0)).join(' ');
        }

        return data.map(item => `${indent}- ${toToon(item, indentLevel + 1).trim()}`).join('\n');
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';

        return keys.map(key => {
            const value = data[key];
            const formattedKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : JSON.stringify(key);

            if (Array.isArray(value)) {
                return `${indent}${formattedKey}:\n${toToon(value, indentLevel + 1)}`;
            }

            if (typeof value === 'object' && value !== null) {
                return `${indent}${formattedKey}:\n${toToon(value, indentLevel + 1)}`;
            }

            return `${indent}${formattedKey}: ${toToon(value, 0)}`;
        }).join('\n');
    }

    return String(data);
}
