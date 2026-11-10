const legacyGroup = /^(?:digital skills|professional skills|competenze digitali|competenze professionali):\s*/i;

function splitList(value: string): string[] {
  let depth = 0;
  let start = 0;
  const items: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth = Math.max(0, depth - 1);
    if (value[i] === "," && depth === 0) {
      items.push(value.slice(start, i));
      start = i + 1;
    }
  }
  items.push(value.slice(start));
  return items;
}

export function skillItems(value: string): string[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = lines.flatMap((line) => {
    const group = line.match(legacyGroup);
    if (group) return splitList(line.slice(group[0].length));
    return lines.length === 1 && !line.includes(":") ? splitList(line) : [line];
  });
  return items.map((item) => item.trim().replace(/^[-*•]\s+/, "")).filter(Boolean);
}
