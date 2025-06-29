import * as t from '@babel/types';

export function extractVariableNames(id: t.Identifier | t.ArrayPattern | t.ObjectPattern): string[] {
  if (t.isIdentifier(id)) {
    return extractFromIdentifier(id);
  } else if (t.isArrayPattern(id)) {
    return extractFromArrayPattern(id);
  } else if (t.isObjectPattern(id)) {
    return extractFromObjectPattern(id);
  }
  return [];
}

export function extractFromIdentifier(id: t.Identifier): string[] {
  return [id.name];
}

export function extractFromArrayPattern(id: t.ArrayPattern): string[] {
  const names: string[] = [];
  id.elements.forEach((el) => {
    if (t.isIdentifier(el)) {
      names.push(el.name);
    }
  });
  return names;
}

export function extractFromObjectPattern(id: t.ObjectPattern): string[] {
  const names: string[] = [];
  id.properties.forEach((prop) => {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
      names.push(prop.value.name);
    }
  });
  return names;
}
