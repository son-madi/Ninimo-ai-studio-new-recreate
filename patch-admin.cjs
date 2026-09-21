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

// Add the modal HTML before the Reset Modal
const modalHtml = `
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Account</h3>
                  <p className="text-xs text-zinc-400">{deleteModalUser.username}</p>
                </div>
              </div>

              <div className="py-4 text-sm text-zinc-300">
                Are you sure you want to permanently delete <strong>{deleteModalUser.username}</strong> and all associated bots? This action cannot be undone.
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeDeleteAccount(deleteModalUser.id);
                    setDeleteModalUser(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

code = code.replace(
  '{/* Password Reset Modal */}',
  modalHtml + '\n\n      {/* Password Reset Modal */}'
);

fs.writeFileSync(file, code);
