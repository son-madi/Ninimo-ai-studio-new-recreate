const fs = require('fs');

const file = 'src/components/AdminPage.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Add state
code = code.replace(
  'const [resetModalUser, setResetModalUser] = useState<AdminAccountInfo | null>(null);',
  'const [resetModalUser, setResetModalUser] = useState<AdminAccountInfo | null>(null);\n  const [deleteModalUser, setDeleteModalUser] = useState<AdminAccountInfo | null>(null);'
);

// Modify handleDeleteAccount
code = code.replace(
  'const handleDeleteAccount = async (targetUserId: string, username: string) => {',
  'const executeDeleteAccount = async (targetUserId: string) => {'
);
code = code.replace(
  `    if (!window.confirm(\`PERMANENTLY DELETE "\${username}" and all associated bots? This cannot be undone.\`)) {\n      return;\n    }\n\n    setActionLoading(\`delete-\${targetUserId}\`);`,
  `    setActionLoading(\`delete-\${targetUserId}\`);`
);

// Modify button onClick
code = code.replace(
  'onClick={() => handleDeleteAccount(account.id, account.username)}',
  'onClick={() => setDeleteModalUser(account)}'
);

fs.writeFileSync(file, code);
