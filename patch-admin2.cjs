const fs = require('fs');

const file = 'src/components/AdminPage.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  "    if (!window.confirm('Are you sure you want to clear ALL general chat messages? This cannot be undone.')) {\n      return;\n    }",
  "    // window.confirm blocked in iframe"
);
code = code.replace(
  "    if (!window.confirm(`Are you sure you want to run \"${action.replace('_', ' ').toUpperCase()}\" across all user bots?`)) {\n      return;\n    }",
  "    // window.confirm blocked in iframe"
);
code = code.replace(
  "    if (!window.confirm(`Log into \"${username}\"'s session directly?`)) return;",
  "    // window.confirm blocked in iframe"
);
code = code.replace(
  "if (action === 'delete' && !window.confirm('Delete this bot instance?')) return;",
  "// window.confirm blocked in iframe"
);

fs.writeFileSync(file, code);
