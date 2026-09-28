import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
  'fill-[#ecff00]': 'fill-accent',
  'text-[#ff3000]': 'text-primary',
  'bg-[#ff3000]': 'bg-primary',
  'bg-[#ecff00]': 'bg-accent',
  'border-[#ff3000]/60': 'border-primary/60',
  'border-[#ff3000]/20': 'border-primary/20',
  'border-[#ff3000]': 'border-primary',
  'bg-[#121212]': 'bg-card',
  'focus:border-[#ff3000]': 'focus:border-primary',
  'hover:border-[#ff3000]': 'hover:border-primary',
  'hover:text-[#ff3000]': 'hover:text-primary',
  'group-hover:text-[#ff3000]': 'group-hover:text-primary',
  'bg-gradient-to-r': 'bg-linear-to-r',
  'bg-gradient-to-t': 'bg-linear-to-t',
  'flex-shrink-0': 'shrink-0',
  'min-w-[2rem]': 'min-w-8',
  'tracking-[0.1em]': 'tracking-widest'
};

for (const [target, replacement] of Object.entries(replacements)) {
  content = content.split(target).join(replacement);
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Fixed IDE warnings in App.tsx!');
