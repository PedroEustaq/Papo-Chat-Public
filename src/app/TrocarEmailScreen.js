import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from './firebase';
import { reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function TrocarEmailScreen() {
  const navigation = useNavigation();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateEmail = async () => {
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Digite sua senha atual.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const user = auth.currentUser;

      if (!user) {
        setErrorMessage('Você precisa estar logado para trocar o e-mail.');
        return;
      }

      if (!user.email) {
        setErrorMessage('Não foi possível identificar o e-mail atual da conta.');
        return;
      }

      if (trimmedEmail.toLowerCase() === user.email.toLowerCase()) {
        setErrorMessage('Digite um e-mail diferente do atual.');
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, trimmedEmail);

      setSuccessMessage(`Enviamos um e-mail de confirmação para o e-mail atual cadastrado. Acesse sua caixa de entrada para concluir a troca.`);
      setNewEmail('');
      setPassword('');
    } catch (error) {
      console.log('Erro ao trocar e-mail:', error);

      if (error.code === 'auth/requires-recent-login') {
        setErrorMessage('Faça login novamente para trocar o e-mail.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('Digite um e-mail válido.');
      } else if (error.code === 'auth/wrong-password') {
        setErrorMessage('Senha atual incorreta.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('Este e-mail já está sendo usado por outra conta.');
      } else {
        setErrorMessage('Não foi possível iniciar a troca de e-mail. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trocar e-mail</Text>
      <TextInput
        style={[styles.input, errorMessage && !password ? styles.inputError : null]}
        placeholder="Senha atual"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (errorMessage) {
            setErrorMessage('');
          }
        }}
        secureTextEntry
      />
      <TextInput
        style={[styles.input, errorMessage ? styles.inputError : null]}
        placeholder="Novo e-mail"
        value={newEmail}
        onChangeText={(value) => {
          setNewEmail(value);
          if (errorMessage) {
            setErrorMessage('');
          }
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleUpdateEmail} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Salvar e-mail'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cfcfcf',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ff4d4f',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 13,
    marginBottom: 12,
  },
  successText: {
    color: '#009959',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#009959',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#009959',
    fontWeight: '700',
  },
});
