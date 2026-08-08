# Papo

Aplicativo de conversas desenvolvido com React Native + Expo.

## Public repository

Esta versão foi preparada para publicação do código-fonte. Credenciais e identificadores de serviços externos não fazem parte deste pacote.

### Firebase

A configuração real do Firebase foi removida de `src/app/firebase.js` e substituída por placeholders.

Para executar recursos que dependem do backend, é necessário configurar um projeto Firebase próprio e preencher os valores nesse arquivo.

> Não publique credenciais privadas, chaves de serviço ou arquivos de configuração que contenham segredos.

## Executar

```bash
npm install
npx expo start
```

Para desenvolvimento Android:

```bash
npx expo run:android
```

## Estrutura

- `src/app/` — telas, navegação e funcionalidades do aplicativo
- `assets/` — imagens e fontes
- `Websites/` — páginas relacionadas ao projeto
- `android/` — projeto nativo Android

## Observação

O pacote publicado contém o código-fonte e os assets necessários para desenvolvimento. Artefatos de build e credenciais/configurações específicas do ambiente original foram removidos.
