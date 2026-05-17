1. Runtime-derived RC4 key
Mix your hardcoded key bytes with something pulled from the executor environment at runtime — like a hash of tostring(math.random) or a specific global's address. Static dumping of the key no longer works without running it in the real environment.
2. Environment-locked opaque predicates
Replace your dead while X > 0 loop with conditions built from executor-specific values that always evaluate the same way but can't be resolved statically. Wrap your integrity check inside one so it can't be cleanly removed.
