/**
 * TypeScript interfaces for Bear's SQLite database entities
 * Based on Core Data schema with Z-prefixed table names
 */
// Error types
export class BearDatabaseError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'BearDatabaseError';
    }
}
export class BearSafetyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BearSafetyError';
    }
}
//# sourceMappingURL=bear.js.map