import { CodeContext } from '../types';

export function linkParentContexts(allFunctionContexts: CodeContext[]) {
  allFunctionContexts.forEach((ctx, index) => {
    if (index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        const parentCtx = allFunctionContexts[i];
        if (parentCtx.insertPos.line < ctx.insertPos.line) {
          ctx.parentContext = parentCtx;
          break;
        }
      }
    }
  });
}
