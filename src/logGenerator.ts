import { CodeContext } from './types';

export function generateConsoleLog(ctx: CodeContext, fileName: string): string {
  if (ctx.type === 'function') {
    const argStr = ctx.args.length ? `args: { ${ctx.args.join(', ')} }` : '';
    return `console.log('[${fileName} > ${ctx.name}]', { ${argStr} });`;
  }

  const parts: string[] = [];

  if (ctx.props.length) {
    parts.push(`props: { ${ctx.props.join(', ')} }`);
  }
  if (ctx.state.length) {
    parts.push(`state: { ${ctx.state.join(', ')} }`);
  }
  if (ctx.refs.length) {
    parts.push(`refs: { ${ctx.refs.map((s) => `${s}: ${s}.current`).join(', ')} }`);
  }
  if (ctx.context.length) {
    parts.push(`context: { ${ctx.context.join(', ')} }`);
  }
  if (ctx.reducers.length) {
    parts.push(`reducer: { ${ctx.reducers.join(', ')} }`);
  }
  if (ctx.locals.length) {
    parts.push(`locals: { ${ctx.locals.join(', ')} }`);
  }

  return `console.log('[${fileName} > ${ctx.name}]', {\n  ${parts.join(',\n  ')}\n});`;
}
