-- Migration: Adiciona campos pessoais e de endereço à tabela clients
-- Execute no Supabase SQL Editor (kyra-atende > SQL Editor)
-- Data: 2026-09-11

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS cpf          TEXT,
  ADD COLUMN IF NOT EXISTS birth_date   DATE,
  ADD COLUMN IF NOT EXISTS gender       TEXT,       -- 'masculino' | 'feminino'
  ADD COLUMN IF NOT EXISTS nationality  TEXT,
  ADD COLUMN IF NOT EXISTS profession   TEXT,
  ADD COLUMN IF NOT EXISTS cep          TEXT,
  ADD COLUMN IF NOT EXISTS logradouro   TEXT,
  ADD COLUMN IF NOT EXISTS numero       TEXT,
  ADD COLUMN IF NOT EXISTS complemento  TEXT,
  ADD COLUMN IF NOT EXISTS bairro       TEXT,
  ADD COLUMN IF NOT EXISTS estado       TEXT,       -- UF: 'SP', 'RJ', etc.
  ADD COLUMN IF NOT EXISTS cidade       TEXT;
