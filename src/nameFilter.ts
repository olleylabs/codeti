export function countLetterA(name: string): number {
  return (name.match(/a/gi) ?? []).length;
}

export function hasExactlyThreeAs(name: string): boolean {
  return countLetterA(name) === 3;
}
