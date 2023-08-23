import { PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions, TestInfo, TestType, test as base } from "@playwright/test";

type AddParameters<
    TFunction extends (...args: any) => any,
    TParameters extends [...args: any]
> = ((
    ...args: [...Parameters<TFunction>, ...TParameters]
) => ReturnType<TFunction>) &
    TFunction;

type GeneratorMapEntry<T> = {
    valid: T[];
    edge?: T[];
    invalid?: T[];
};
type GeneratorMap<T> = {
    [K in keyof T]: GeneratorMapEntry<T[K]>
};

type NameToType<TypeMap, K> =
    K extends keyof TypeMap ? TypeMap[K] :
    K extends GeneratorMapEntry<infer K0> ? GeneratorMapEntry<K0> :
    never;

type NameToExtractedType<TypeMap, K> =
    K extends keyof TypeMap ? TypeMap[K] :
    K extends GeneratorMapEntry<infer K0> ? K0 :
    never;

type CheckData<TypeMap, T> = { [K in keyof T]:
    NameToType<TypeMap, T[K]> extends never ? keyof TypeMap : T[K]
}

const labelArray = (values, label: DataValueLabel): DataValue['values'] => {
    return (values ?? []).map(value => ({
        label,
        value
    }));
}

type DataValueLabel = 'valid' | 'edge' | 'invalid';
type DataValue = {
    key: string,
    values: {
        label: DataValueLabel,
        value: any
    }[]
}
const getDataValues = <const TypeMap, const T extends Record<keyof T, NameToType<TypeMap, T[keyof T]>>>(
    data: T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>,
    generators: GeneratorMap<TypeMap>
): DataValue[] => {
    const keyedValues = Object
        .entries(data)
        .map(([key, value]) => {
            if (typeof value === 'object' && value && 'valid' in value) { // Manual entry
                return { key, value };
            } else { // Generator
                return { key, value: generators[value as any] };
            }
        });
    return keyedValues.map(({ key, value }) => ({
        key,
        values: [
            ...labelArray(value.valid, 'valid'),
            ...labelArray(value.edge, 'edge'),
            ...labelArray(value.invalid, 'invalid')
        ]
    }));
}

const getPermutations = (flattened: DataValue[]) => {
    let maxIndex = 0;
    for (let i = 1; i < flattened.length; i++) {
        if (flattened[i].values.length > flattened[maxIndex].values.length) {
            maxIndex = i;
        }
    }
    const maxLength = flattened[maxIndex].values.length;

    let permutations: any[] = [];
    for (let i = 0; i < maxLength; i++) {
        permutations.push(flattened.map(({ key, values }) => {
            const index = i < values.length ? i : 0;
            return {
                key,
                value: values[index]
            }
        }));
    }
    return permutations;
}

const arrayOr = <T>(arr: T[], or: T[]) => {
    return (!arr || arr.length === 0) ? or : arr;
}

const getTestData = <const TypeMap, const T extends Record<keyof T, NameToType<TypeMap, T[keyof T]>>>(
    data: T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>,
    generators: GeneratorMap<TypeMap>
) => {
    let flattened = getDataValues(data, generators);
    let validEdge = flattened.map(({ key, values }) => ({
        key,
        values: values.filter(value => value.label !== 'invalid')
    }));
    let invalid = flattened.map(({ key, values }) => ({
        key,
        values: arrayOr(values.filter(value => value.label === 'invalid'), [values[0]])
    })); // Use valid data if no invalid data found

    return [
        ...getPermutations(validEdge),
        ...getPermutations(invalid)
    ]
}

// // Attempt at a curried version of registerData that can be partially applied in setup.ts so that only data is required to be supplied in .spec.ts files.
// // This unfortunately breaks the type inference, and TypeMap data gets lost when calling the second function. 
// export const registerDataTypes = <const TypeMap>(
//     generators: GeneratorMap<TypeMap>,
//     baseTest = base
// ) => <const T extends Record<keyof T, NameToType<TypeMap, T[keyof T]>>>(
//     data: T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>
// ) => {
//         let instanceData = {};

//         const test = (
//             title: string,
//             testFunction: (
//                 args: PlaywrightTestArgs &
//                     PlaywrightTestOptions &
//                     PlaywrightWorkerArgs &
//                     PlaywrightWorkerOptions,
//                 testInfo: TestInfo
//             ) => Promise<void> | void,
//             limitData?: (keyof T)[]
//         ) => {
//             const filteredData = Object.fromEntries(
//                 Object
//                     .entries(data)
//                     .filter(([key]) => !!limitData?.includes(key as any))
//             ) as T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>;
//             const permutations = getTestData(filteredData, generators);
//             let variation = 0;
//             baseTest.beforeEach(async ({ }) => {
//                 let isFailing = false; // TODO: Add Failing Test Separation
//                 const permutation = permutations[variation];
//                 permutation.forEach(({ key, value }) => permutation[key] = value)
//                 if (isFailing) baseTest.fail();
//                 variation++;
//             });
//             baseTest.describe(title, () => {
//                 for (let i = 0; i < permutations.length; i++) {
//                     baseTest(`Variation ${i + 1}`, testFunction);
//                 }
//             });
//         }
//         Object.assign(test, baseTest);
//         return {
//             data: instanceData as { [K in keyof T]: NameToExtractedType<TypeMap, T[K]> },
//             test: test as AddParameters<
//                 TestType<
//                     PlaywrightTestArgs & PlaywrightTestOptions,
//                     PlaywrightWorkerArgs & PlaywrightWorkerOptions
//                 >,
//                 [limitData: (keyof T)[]]
//             >
//         };
//     }

export const registerData = <const TypeMap, const T extends Record<keyof T, NameToType<TypeMap, T[keyof T]>>>(
    generators: GeneratorMap<TypeMap>,
    data: T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>,
    baseTest = base
) => {
    let instanceData = {};

    const test = (
        title: string,
        testFunction: (
            args: PlaywrightTestArgs &
                PlaywrightTestOptions &
                PlaywrightWorkerArgs &
                PlaywrightWorkerOptions,
            testInfo: TestInfo
        ) => Promise<void> | void,
        limitData?: (keyof T)[]
    ) => {
        const filteredData = Object.fromEntries(
            Object
                .entries(data)
                .filter(([key]) => !!limitData?.includes(key as any))
        ) as T extends CheckData<TypeMap, T> ? T : CheckData<TypeMap, T>;
        if (!limitData || !limitData.length) {
            baseTest(title, testFunction);
            return;
        }
        const permutations = getTestData(filteredData, generators);
        let variation = 0;
        baseTest.beforeEach(async ({ }) => {
            let isFailing = false; // TODO: Add Failing Test Separation
            const permutation = permutations[variation];
            permutation.forEach(({ key, value }) => instanceData[key] = value.value)
            if (isFailing) baseTest.fail();
            variation++;
        });
        baseTest.describe(title, () => {
            for (let i = 0; i < permutations.length; i++) {
                baseTest(`Variation ${i + 1}`, testFunction);
            }
        });
    }
    Object.assign(test, baseTest);
    return {
        data: instanceData as { [K in keyof T]: NameToExtractedType<TypeMap, T[K]> },
        test: test as AddParameters<
            TestType<
                PlaywrightTestArgs & PlaywrightTestOptions,
                PlaywrightWorkerArgs & PlaywrightWorkerOptions
            >,
            [limitData: (keyof T)[]]
        >
    };
}