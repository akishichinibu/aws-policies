type StringKeyof<T> = keyof T & string;

export type MapperToLiteral<T extends { [key: string]: string }> = `${StringKeyof<T>}:${T[StringKeyof<T>]}`;
