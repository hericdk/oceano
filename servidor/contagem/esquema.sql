CREATE TABLE IF NOT EXISTS contagens (dia TEXT, fonte TEXT, dimensao TEXT, valor TEXT, total INTEGER NOT NULL, PRIMARY KEY (dia, fonte, dimensao, valor));
CREATE TABLE IF NOT EXISTS recibos (hash TEXT PRIMARY KEY, dia TEXT, fonte TEXT, dados TEXT);
