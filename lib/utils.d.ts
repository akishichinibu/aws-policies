type StringKeyof<T> = keyof T & string;

export type MapperToLiteral<T extends { [key: string]: string }> = `${StringKeyof<T>}:${T[StringKeyof<T>]}`;

export type DigitalType = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type CharType =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | DigitalType;

// @ts-ignore
export type Join<D extends string, S extends (string | Join<string[], D>)[]> = S['length'] extends 1
  ? `${S[0]}`
  : S extends [infer First, ...infer Rest]
  ? // @ts-ignore
    `${First}${D}${Join<D, Rest>}`
  : '';
