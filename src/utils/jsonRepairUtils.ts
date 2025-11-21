import { jsonrepair } from 'jsonrepair';
import { formatJson } from './jsonUtils';

export const repairJson = (jsonString: string): string => {
    try {
        // First try standard repair
        try {
            const repaired = jsonrepair(jsonString);
            return formatJson(repaired);
        } catch (e) {
            // If standard repair fails, try to balance brackets
            const balanced = balanceBrackets(jsonString);
            const repaired = jsonrepair(balanced);
            return formatJson(repaired);
        }
    } catch (error) {
        throw new Error('Unable to repair JSON');
    }
};

function balanceBrackets(str: string): string {
    let openBraces = 0;
    let openBrackets = 0;
    let result = str;

    // Count open/close
    for (const char of str) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }

    // Append missing closing
    while (openBraces > 0) {
        result += '}';
        openBraces--;
    }
    while (openBrackets > 0) {
        result += ']';
        openBrackets--;
    }

    // Remove extra closing (simple heuristic: remove from end if count is negative)
    // A better approach for extra closing is harder without a parser, 
    // but let's try to remove trailing invalid characters if we have negative count.
    // For now, appending missing is the most common fix requested.

    return result;
}
