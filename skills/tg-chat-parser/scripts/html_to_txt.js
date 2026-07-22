const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || '/root/.openclaw/workspace/obsidian_vault/raw/chats/chat_001';
const LINES_PER_FILE = 4000;

const extractTextFromHtml = (html) => {
  const messages = [];
  const lines = html.split('\n');
  let currentMsg = { time: '', name: 'Unknown', text: [] };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('class="message default')) {
       if (currentMsg.text.length > 0) {
           messages.push(`[${currentMsg.time}] ${currentMsg.name}: ${currentMsg.text.join(' ')}`);
       }
       currentMsg = { time: '', name: 'Unknown', text: [] };
    }
    
    if (line.includes('class="pull_right date details"')) {
        const match = line.match(/title="([^"]+)"/);
        if (match) currentMsg.time = match[1];
    }
    
    if (line.includes('class="from_name"')) {
        const match = lines[i+1] && lines[i+1].match(/([^<]+)/);
        if (match) currentMsg.name = match[1].trim();
    }
    
    if (line.includes('class="text"')) {
        let textLine = lines[i+1] ? lines[i+1].replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').trim() : '';
        if (textLine) currentMsg.text.push(textLine);
    }
  }
  
  if (currentMsg.text.length > 0) {
     messages.push(`[${currentMsg.time}] ${currentMsg.name}: ${currentMsg.text.join(' ')}`);
  }
  
  return messages;
};

let allMessages = [];

// Ищем все файлы messages*.html
const files = fs.readdirSync(targetDir).filter(f => f.startsWith('messages') && f.endsWith('.html'));
files.sort((a, b) => {
    const numA = parseInt(a.replace('messages', '').replace('.html', '') || '0');
    const numB = parseInt(b.replace('messages', '').replace('.html', '') || '0');
    return numA - numB;
});

for (const file of files) {
   const html = fs.readFileSync(path.join(targetDir, file), 'utf8');
   allMessages = allMessages.concat(extractTextFromHtml(html));
}

// Удаляем старые parsed_chat*.txt перед записью новых
const oldFiles = fs.readdirSync(targetDir).filter(f => f.startsWith('parsed_chat') && f.endsWith('.txt'));
for (const f of oldFiles) fs.unlinkSync(path.join(targetDir, f));

// Разрезаем на файлы по LINES_PER_FILE строк
for (let i = 0; i < allMessages.length; i += LINES_PER_FILE) {
    const chunk = allMessages.slice(i, i + LINES_PER_FILE);
    const fileIndex = Math.floor(i / LINES_PER_FILE) + 1;
    fs.writeFileSync(path.join(targetDir, `parsed_chat_${fileIndex}.txt`), chunk.join('\n'));
}

console.log(`[${targetDir}] Done! Total messages: ${allMessages.length}. Created ${Math.ceil(allMessages.length / LINES_PER_FILE)} files.`);
