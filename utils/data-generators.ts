export const baseDataTypes = {
    integer: {
        valid: [Math.round(Math.random() * 200 - 100)],
        edge: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    },
    decimal: {
        valid: [Math.random() * 200 - 100],
        edge: [Number.MAX_VALUE, Number.MIN_VALUE],
    },
    boolean: {
        valid: [true, false],
    },
    username: {
        valid: ["student1", "staff1", "admin1"],
        invalid: [Math.random().toString(36).substring(2)],
    },
    title: {
        valid: ["An Example Title"],
        edge: ["lorem ipsum ".repeat(100), Math.random().toString(36).substring(2)],
    },
    paragraph: {
        valid: ["lorem ipsum ".repeat(100)],
        edge: [Math.random().toString(36).substring(2), ""],
    }
};
