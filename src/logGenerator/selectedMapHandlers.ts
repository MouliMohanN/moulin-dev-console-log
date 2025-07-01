import { CodeContext } from '../types';
import { logger } from '../../test/logger';

export function createSelectedMap(ctx: CodeContext, selectedItems: string[]): { [key: string]: string[] } {
  const selectedMap: { [key: string]: string[] } = {};
  logger.log('Initial selectedMap:', selectedMap);
  for (const typeKey in ctx.variables) {
    selectedMap[typeKey] = [];
  }
  logger.log('selectedMap after ctx.variables initialization:', selectedMap);
  if (ctx.args && ctx.args.length > 0) {
    selectedMap.args = [];
  }
  logger.log('selectedMap after ctx.args initialization:', selectedMap);
  selectedItems.forEach((item) => {
    const parts = item.split(': ');
    const type = parts.length > 1 ? parts[0].toLowerCase() : 'locals';
    const name = parts.length > 1 ? parts.slice(1).join(': ') : parts[0];
    if (type === 'args' && ctx.type === 'function') {
      selectedMap.args.push(name);
    } else if (selectedMap[type]) {
      selectedMap[type].push(name);
    } else {
      selectedMap[type] = selectedMap[type] || [];
      selectedMap[type].push(name);
    }
  });
  logger.log('Final selectedMap:', selectedMap);
  return selectedMap;
}

export function stringifySelectedMap(selectedMap: { [key: string]: string[] }): string {
  const parts: string[] = [];
  for (const typeKey in selectedMap) {
    if (selectedMap[typeKey].length) {
      if (typeKey === 'refs') {
        parts.push(`refs: { ${selectedMap[typeKey].map((s) => `${s}: ${s}.current`).join(', ')} }`);
      } else if (typeKey === 'reducers') {
        parts.push(`reducer: { ${selectedMap[typeKey].join(', ')} }`);
      } else if (typeKey === 'reduxContext') {
        parts.push(`reduxContext: { ${selectedMap[typeKey].join(', ')} }`);
      } else if (typeKey === 'args') {
        parts.push(`args: { ${selectedMap[typeKey].join(', ')} }`);
      } else {
        parts.push(`${typeKey}: { ${selectedMap[typeKey].join(', ')} }`);
      }
    }
  }
  return parts.length > 0 ? `{ ${parts.join(', ')} }` : '';
}
