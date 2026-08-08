import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { criarGrupo, entrarNoGrupoPorCodigo } from './FuncGrupos';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { pickImageAndConvertToBase64 } from './FuncFirebase';
import { doc, getDoc } from 'firebase/firestore';
import VersionCheck from "./VersionCheck.js"; // Nova tela de chat privado
import { db } from './firebase';

export default function CriarGrupoScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemGrupo, setImagemGrupo] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [codigoGrupo, setCodigoGrupo] = useState('');

  const selecionarImagem = async () => {
    const imagem = await pickImageAndConvertToBase64();
    if (imagem) {
      setImagemGrupo(imagem);
    }
  };

  const handleCriarGrupo = async () => {
    if (nome.trim()) {
      const grupoId = await criarGrupo(nome.trim(), descricao.trim(), isPrivate, imagemGrupo);
      if (grupoId) {
        navigation.goBack();
      }
    }
  };

  const handleEntrarGrupo = async () => {
    if (!codigoGrupo.trim()) {
      Alert.alert("Erro", "Por favor, insira o código do grupo");
      return;
    }

    try {
      // Primeiro, verifica se o grupo existe e permite convites
      const grupoRef = doc(db, "grupos", codigoGrupo.trim());
      const grupoDoc = await getDoc(grupoRef);

      if (!grupoDoc.exists()) {
        Alert.alert("Erro", "Grupo não encontrado");
        return;
      }

      const grupoData = grupoDoc.data();

      // Verifica se o grupo permite convites
      if (!grupoData.configuracoes?.permiteConvites) {
        Alert.alert("Erro", "Este grupo não está aceitando novos membros no momento");
        return;
      }

      // Se permite convites, tenta entrar no grupo
      const resultado = await entrarNoGrupoPorCodigo(codigoGrupo.trim());
      if (resultado.success) {
        Alert.alert("Sucesso", resultado.message);
        navigation.goBack();
      } else {
        Alert.alert("Erro", resultado.message);
      }
    } catch (error) {
      console.error("Erro ao entrar no grupo:", error);
      Alert.alert("Erro", "Não foi possível entrar no grupo");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <VersionCheck />
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.text }]}>Criar/Entrar em Grupo</Text>
      </View>

      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.inputBackground,
            color: theme.text,
            borderColor: theme.borderColor
          }]}
          placeholder="Código do Grupo"
          placeholderTextColor={theme.text}
          value={codigoGrupo}
          onChangeText={setCodigoGrupo}
        />

        <TouchableOpacity
          style={[styles.entrarButton, { backgroundColor: theme.primary }]}
          onPress={handleEntrarGrupo}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Entrar em Grupo</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.borderColor }]} />
          <Text style={[styles.dividerText, { color: theme.text }]}>ou</Text>
          <View style={[styles.line, { backgroundColor: theme.borderColor }]} />
        </View>

        <TouchableOpacity style={styles.imagemContainer} onPress={selecionarImagem}>
          {imagemGrupo ? (
            <Image source={{ uri: imagemGrupo }} style={styles.imagemGrupo} />
          ) : (
            <View style={[styles.imagemPlaceholder, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
              <Ionicons name="camera" size={40} color={theme.text} />
              <Text style={[styles.imagemTexto, { color: theme.text }]}>Adicionar Foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, {
            backgroundColor: theme.inputBackground,
            color: theme.text,
            borderColor: theme.borderColor
          }]}
          placeholder="Nome do Grupo"
          placeholderTextColor={theme.text}
          value={nome}
          onChangeText={setNome}
        />

        <TextInput
          style={[styles.input, styles.textArea, {
            backgroundColor: theme.inputBackground,
            color: theme.text,
            borderColor: theme.borderColor
          }]}
          placeholder="Descrição do Grupo"
          placeholderTextColor={theme.text}
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={4}
        />
        {/* 
        <TouchableOpacity
          style={[styles.privateToggle, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}
          onPress={() => setIsPrivate(!isPrivate)}
        >
          <Text style={[styles.privateText, { color: theme.text }]}>
            Grupo Privado
          </Text>
          <Ionicons
            name={isPrivate ? "checkbox" : "square-outline"}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
*/}
        <TouchableOpacity
          style={[styles.criarButton, { backgroundColor: theme.primary }]}
          onPress={handleCriarGrupo}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Criar Grupo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    fontFamily: 'Inter-Regular',
  },
  content: {
    padding: 20,
  },
  imagemContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imagemGrupo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
  },
  imagemPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  imagemTexto: {
    marginTop: 5,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  privateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  privateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  criarButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  entrarButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Regular',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
