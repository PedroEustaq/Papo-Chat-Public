import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from './firebase';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function TrocarSenhaScreen() {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim()) {
      setErrorMessage('Digite sua senha atual.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Digite uma nova senha.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const user = auth.currentUser;

      if (!user) {
        setErrorMessage('Você precisa estar logado para trocar a senha.');
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, password);
      setSuccessMessage('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        setErrorMessage('Faça login novamente para trocar a senha.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('Escolha uma senha mais forte.');
      } else if (error.code === 'auth/wrong-password') {
        setErrorMessage('Senha atual incorreta.');
      } else {
        setErrorMessage('Não foi possível atualizar a senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trocar senha</Text>
      <TextInput
        style={[styles.input, errorMessage && !currentPassword ? styles.inputError : null]}
        placeholder="Senha atual"
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          if (errorMessage) {
            setErrorMessage('');
          }
        }}
        secureTextEntry
      />
      <TextInput
        style={[styles.input, errorMessage && !password ? styles.inputError : null]}
        placeholder="Nova senha"
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
        style={[styles.input, errorMessage && password !== confirmPassword ? styles.inputError : null]}
        placeholder="Confirmar senha"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (errorMessage) {
            setErrorMessage('');
          }
        }}
        secureTextEntry
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Salvar senha'}</Text>
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
