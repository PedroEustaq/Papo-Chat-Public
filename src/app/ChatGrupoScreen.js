import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Dimensions, Modal, Alert, Animated, Switch, Clipboard, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { buscarMensagensGrupo, enviarMensagemGrupo } from './FuncGrupos';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { getUserName, getProfileImage, pickImageForChat, getUserCustomId, pickImageAndConvertToBase64 } from './FuncFirebase';
import ImageZoom from 'react-native-image-pan-zoom';
import VersionCheck from "./VersionCheck.js"; // Nova tela de chat privado
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function ChatGrupoScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { grupoId, grupoNome, grupoImagem } = route.params;
  const { theme, isDarkMode } = useTheme();
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [nomesUsuarios, setNomesUsuarios] = useState({});
  const [imagensUsuarios, setImagensUsuarios] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [customId, setCustomId] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [grupoInfo, setGrupoInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaImagem, setNovaImagem] = useState(null);
  const [novoNome, setNovoNome] = useState('');
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(-20)).current;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    carregarCustomId();
  }, []);

  useEffect(() => {
    if (customId) {
      carregarMensagens();
      carregarInfoGrupo();
      setIsLoading(false);

      const intervalId = setInterval(() => {
        carregarMensagens();
        carregarInfoGrupo();
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [customId]);

  useEffect(() => {
    if (showConfigModal && grupoInfo) {
      setNovoNome(grupoInfo.nome || '');
      setNovaDescricao(grupoInfo.descricao || '');
    }
  }, [showConfigModal, grupoInfo]);

  const carregarInfoGrupo = async () => {
    try {
      const grupoRef = doc(db, "grupos", grupoId);
      const grupoDoc = await getDoc(grupoRef);
      if (grupoDoc.exists()) {
        const data = grupoDoc.data();
        setGrupoInfo(data);

        if (customId) {
          setIsAdmin(data.membros[customId]?.cargo === 'admin');
        }

        // Carregar nomes e imagens dos membros
        const nomes = {};
        const imagens = {};
        for (const [userId, info] of Object.entries(data.membros)) {

          nomes[userId] = await getUserName(userId);

          imagens[userId] = await getProfileImage(userId);

        }
        setNomesUsuarios(nomes);
        setImagensUsuarios(imagens);
      }
    } catch (error) {
      console.error("Erro ao carregar informações do grupo:", error);
    }
  };

  const handleOptionsPress = () => {
    if (showOptions) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setShowOptions(false);
      });
    } else {
      setShowOptions(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const handleAtualizarGrupo = async () => {
    try {
      const grupoRef = doc(db, "grupos", grupoId);
      const updates = {};

      if (novoNome !== grupoInfo.nome) {
        updates.nome = novoNome;
      }

      if (novaDescricao !== grupoInfo.descricao) {
        updates.descricao = novaDescricao;
      }

      if (novaImagem) {
        updates.imagemGrupo = novaImagem;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(grupoRef, updates);
        Alert.alert("Sucesso", "Grupo atualizado com sucesso!");
        carregarInfoGrupo();
      }

      setShowConfigModal(false);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o grupo.");
      console.error(error);
    }
  };

  const handleSelecionarImagem = async () => {
    const imagem = await pickImageAndConvertToBase64();
    if (imagem) {
      setNovaImagem(imagem);
    }
  };

  const carregarCustomId = async () => {
    const id = await getUserCustomId(auth.currentUser.uid);
    setCustomId(id);
  };

  //Rolar para baixo
  useEffect(() => {
    if (flatListRef.current && mensagens.length > 0) {
      const ultimaMensagem = mensagens[mensagens.length - 1];
      const ultimaMensagemTimestamp = ultimaMensagem.timestamp;

      // Só rola se a última mensagem for mais recente que 3 segundos
      const agora = new Date();
      const timestampMensagem = new Date(ultimaMensagemTimestamp);
      const diferencaTempo = agora - timestampMensagem;

      if (diferencaTempo < 3000) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    }
  }, [mensagens]);

  const carregarMensagens = async () => {
    const mensagensGrupo = await buscarMensagensGrupo(grupoId);
    setMensagens(mensagensGrupo);
  };

  const enviarMensagem = async () => {
    if (novaMensagem.trim()) {
      await enviarMensagemGrupo(grupoId, novaMensagem.trim());
      setNovaMensagem('');
      carregarMensagens();
    }
  };

  const handleSendImage = async (base64Image) => {
    try {
      await enviarMensagemGrupo(grupoId, base64Image, 'image');
      carregarMensagens();
    } catch (error) {
      alert("Não foi possível enviar a imagem.");
      console.error(error);
    }
  };

  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handlePromoverAdmin = async (userId) => {
    try {
      if (!isAdmin) {
        Alert.alert("Erro", "Apenas administradores podem promover membros");
        return;
      }

      const grupoRef = doc(db, "grupos", grupoId);
      const grupoDoc = await getDoc(grupoRef);
      const grupoData = grupoDoc.data();

      // Verifica se o usuário já é admin
      if (grupoData.membros[userId]?.cargo === 'admin') {
        Alert.alert("Erro", "Este usuário já é administrador");
        return;
      }

      // Atualiza o cargo do membro para admin
      await updateDoc(grupoRef, {
        [`membros.${userId}.cargo`]: 'admin'
      });

      Alert.alert("Sucesso", "Membro promovido a administrador com sucesso!");
      carregarInfoGrupo();
    } catch (error) {
      console.error("Erro ao promover administrador:", error);
      Alert.alert("Erro", "Não foi possível promover o membro");
    }
  };

  const handleExpulsarMembro = async (userId) => {
    try {
      if (!isAdmin) {
        Alert.alert("Erro", "Apenas administradores podem expulsar membros");
        return;
      }

      const grupoRef = doc(db, "grupos", grupoId);
      const grupoDoc = await getDoc(grupoRef);
      const grupoData = grupoDoc.data();

      // Remove o membro do objeto de membros
      const { [userId]: membroRemovido, ...outrosMembros } = grupoData.membros;

      // Atualiza o documento do grupo
      await updateDoc(grupoRef, {
        membros: outrosMembros
      });

      Alert.alert("Sucesso", "Membro expulso com sucesso!");
      carregarInfoGrupo();

      // Se o usuário expulso for o próprio usuário atual, volta para a tela anterior
      if (userId === customId) {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Erro ao expulsar membro:", error);
      Alert.alert("Erro", "Não foi possível expulsar o membro");
    }
  };

  const handleSairGrupo = async () => {
    try {
      const grupoRef = doc(db, "grupos", grupoId);
      const grupoDoc = await getDoc(grupoRef);
      const grupoData = grupoDoc.data();

      // Remove o usuário atual do objeto de membros
      const { [customId]: membroRemovido, ...outrosMembros } = grupoData.membros;

      // Atualiza o documento do grupo
      await updateDoc(grupoRef, {
        membros: outrosMembros
      });

      Alert.alert("Sucesso", "Você saiu do grupo com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
      Alert.alert("Erro", "Não foi possível sair do grupo");
    }
  };

  const handleDissolverGrupo = async () => {
    try {
      if (!isAdmin) {
        Alert.alert("Erro", "Apenas administradores podem dissolver o grupo");
        return;
      }

      const grupoRef = doc(db, "grupos", grupoId);
      await deleteDoc(grupoRef);

      Alert.alert("Sucesso", "Grupo dissolvido com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao dissolver grupo:", error);
      Alert.alert("Erro", "Não foi possível dissolver o grupo");
    }
  };

  const handleToggleConvite = async (novoValor) => {
    try {
      if (!isAdmin) {
        Alert.alert("Erro", "Apenas administradores podem alterar esta configuração");
        return;
      }

      const grupoRef = doc(db, "grupos", grupoId);
      await updateDoc(grupoRef, {
        'configuracoes.permiteConvites': novoValor
      });

      Alert.alert("Sucesso", novoValor ? "Convites ativados com sucesso!" : "Convites desativados com sucesso!");
      carregarInfoGrupo();
    } catch (error) {
      console.error("Erro ao alterar permissão de convites:", error);
      Alert.alert("Erro", "Não foi possível alterar a permissão de convites");
    }
  };

  const handleCopiarCodigo = () => {
    Clipboard.setString(grupoId);
    Alert.alert("Sucesso", "Código do grupo copiado para a área de transferência!");
  };

  const renderItem = ({ item }) => {
    const isUserMessage = item.remetenteId === customId;
    return (
      <View style={[
        styles.messageContainer,
        isUserMessage ? styles.userMessageContainer : styles.contactMessageContainer
      ]}>
        {!isUserMessage && (
          <Image
            source={imagensUsuarios[item.remetenteId] ? { uri: imagensUsuarios[item.remetenteId] } : require("./decoracoes/TravelerIcon.png")}
            style={styles.userAvatar}
          />
        )}
        <View style={styles.messageContent}>
          {!isUserMessage && (
            <Text style={[styles.userName, { color: theme.text }]}>
              {nomesUsuarios[item.remetenteId] || 'Usuário'}
            </Text>
          )}
          <View
            style={[
              styles.messageItem,
              isUserMessage ? styles.userMessage : styles.contactMessage,
              { backgroundColor: isUserMessage ? theme.cardBackground : "#5CF076" }
            ]}
          >
            {item.tipo === 'image' ? (
              <TouchableOpacity style={{ padding: 0, paddingBottom: 0, paddingTop: 0, }} onPress={() => handleImagePress(item.conteudo)}>
                <Image
                  source={{ uri: item.conteudo }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, { color: isUserMessage ? theme.text : "#000" }]}>
                {item.conteudo}
              </Text>
            )}
            <Text style={[styles.timestampText, { color: isUserMessage ? theme.text : "#000" }]}>
              {(() => {
                const date = new Date(item.timestamp);
                date.setHours(date.getHours() - 0);
                return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              })()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMembro = ({ item }) => {
    const [userId, info] = item;
    return (
      <View style={[styles.membroItem, { backgroundColor: theme.cardBackground }]}>
        <Image
          source={imagensUsuarios[userId] ? { uri: imagensUsuarios[userId] } : require("./decoracoes/TravelerIcon.png")}
          style={styles.membroAvatar}
        />
        <View style={styles.membroInfo}>
          <Text style={[styles.membroNome, { color: theme.text }]}>
            {nomesUsuarios[userId] || 'Usuário'}
          </Text>
          <Text style={[styles.membroCargo, { color: theme.text }]}>
            {info.cargo}
          </Text>
        </View>
        <View style={styles.membroActions}>
          {isAdmin && info.cargo !== 'admin' && (
            <TouchableOpacity
              style={[styles.promoverButton, { backgroundColor: theme.primary }]}
              onPress={() => handlePromoverAdmin(userId)}
            >
              <Text style={[styles.promoverButtonText, { color: isDarkMode ? "#FFF" : "#000", backgroundColor: isDarkMode ? "#000" : "#FFF", }]}>Promover</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.expulsarButton, { backgroundColor: '#FF4444' }]}
              onPress={() => handleExpulsarMembro(userId)}
            >
              <Text style={styles.expulsarButtonText}>Expulsar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.pagina, { backgroundColor: theme.background }]}
    >
      <View style={[styles.cabeca, isDarkMode ? { backgroundColor: theme.cardBackground } : { backgroundColor: "#00FF4C" }]}>
        <VersionCheck />
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image source={require("./icons/ArrowLeft.png")} style={[styles.configicon, isDarkMode ? { tintColor: theme.text } : { tintColor: theme.text }]} />
        </TouchableOpacity>
        <Image
          style={styles.fotoPerfil}
          source={grupoImagem ? { uri: grupoImagem } : require("./decoracoes/TravelerIcon.png")}
        />
        <Text style={[styles.title, { color: theme.text }]}>{grupoNome || 'Grupo'}</Text>
        <View style={isDarkMode ? styles.CabecaMaisOpcoesDark : styles.CabecaMaisOpcoesLight}>
          <TouchableOpacity onPress={handleOptionsPress}>
            <Image source={require("./icons/options-vertical.png")} style={[styles.configicon, { tintColor: theme.text }]} />
          </TouchableOpacity>
        </View>
      </View>

      {showOptions && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => handleOptionsPress()}
          />
          <Animated.View
            style={[
              styles.optionsMenu,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
                backgroundColor: theme.cardBackground,
                borderColor: theme.borderColor
              }
            ]}
          >
            <TouchableOpacity style={styles.optionItem} onPress={() => {
              setShowOptions(false);
              setShowConfigModal(true);
            }}>
              <Text style={[styles.optionText, { color: theme.text }]}>Configurações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => {
              setShowOptions(false);
              handleSairGrupo();
            }}>
              <Text style={[styles.optionText, { color: '#FF4444' }]}>Sair do Grupo</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity style={styles.optionItem} onPress={() => {
                setShowOptions(false);
                handleDissolverGrupo();
              }}>
                <Text style={[styles.optionText, { color: '#FF0000' }]}>Dissolver Grupo</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

        </>
      )}

      <Modal
        visible={showConfigModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}
              onPress={() => setShowConfigModal(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Configurações do Grupo</Text>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.modalContentInner}>
                <View style={styles.grupoIdContainer}>
                  <Text style={[styles.grupoIdLabel, { color: theme.text }]}>ID do Grupo:</Text>
                  <View style={styles.grupoIdRow}>
                    <Text style={[styles.grupoId, { color: theme.text }]}>{grupoId}</Text>
                    <TouchableOpacity onPress={handleCopiarCodigo} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isAdmin && (
                  <>
                    <View style={styles.adminSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações do Grupo</Text>

                      <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Nome do Grupo</Text>
                        <TextInput
                          style={[styles.input2, {
                            backgroundColor: theme.inputBackground,
                            color: theme.text,
                            borderColor: theme.borderColor
                          }]}
                          placeholder="Nome do grupo"
                          value={novoNome}
                          onChangeText={setNovoNome}
                          placeholderTextColor={theme.text}
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Descrição</Text>
                        <TextInput
                          style={[styles.input2, {
                            backgroundColor: theme.inputBackground,
                            color: theme.text,
                            borderColor: theme.borderColor
                          }]}
                          placeholder="Adicione uma descrição ao grupo"
                          value={novaDescricao}
                          onChangeText={setNovaDescricao}
                          placeholderTextColor={theme.text}
                          multiline
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.imageButton2}
                      onPress={handleSelecionarImagem}
                    >
                      <Image source={require("./icons/imageicon.png")} style={{ width: 30, height: 30, }} />
                    </TouchableOpacity>
                    <Text style={[styles.imageButtonText]}>
                      {novaImagem ? 'Imagem Selecionada' : 'Selecionar Imagem'}
                    </Text>
                    <View style={styles.configItem}>
                      <Text style={[styles.configLabel, { color: theme.text }]}>Permitir Convites</Text>
                      <Switch
                        value={grupoInfo?.configuracoes?.permiteConvites ?? false}
                        onValueChange={handleToggleConvite}
                        trackColor={{ false: "#767577", true: "#5FFF72" }}
                        thumbColor={grupoInfo?.configuracoes?.permiteConvites ? "#00FF4C" : "#f4f3f4"}
                      />
                    </View>
                  </>
                )}

                <View style={styles.membrosContainer}>
                  <Text style={[styles.membrosTitle, { color: theme.text }]}>Membros</Text>
                  <FlatList
                    data={grupoInfo?.membros ? Object.entries(grupoInfo.membros) : []}
                    keyExtractor={([userId]) => userId}
                    renderItem={({ item: [userId, info] }) => (
                      <View style={[styles.membroItem, { backgroundColor: theme.cardBackground }]}>
                        <Image
                          source={imagensUsuarios[userId] ? { uri: imagensUsuarios[userId] } : require("./decoracoes/TravelerIcon.png")}
                          style={styles.membroAvatar}
                        />
                        <View style={styles.membroInfo}>
                          <Text style={[styles.membroNome, { color: theme.text }]}>
                            {nomesUsuarios[userId] || 'Usuário'}
                          </Text>
                          <Text style={[styles.membroCargo, { color: theme.text }]}>
                            {info.cargo}
                          </Text>
                        </View>
                        <View style={styles.membroActions}>
                          {isAdmin && info.cargo !== 'admin' && (
                            <TouchableOpacity
                              style={[styles.promoverButton, { backgroundColor: theme.primary }]}
                              onPress={() => handlePromoverAdmin(userId)}
                            >
                              <Text style={[styles.promoverButtonText, { color: isDarkMode ? "#FFF" : "#000", backgroundColor: isDarkMode ? "#000" : "#FFF", }]}>Promover</Text>
                            </TouchableOpacity>
                          )}
                          {isAdmin && (
                            <TouchableOpacity
                              style={[styles.expulsarButton, { backgroundColor: '#FF4444' }]}
                              onPress={() => handleExpulsarMembro(userId)}
                            >
                              <Text style={styles.expulsarButtonText}>Expulsar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  />
                </View>

                <View style={styles.modalButtons}>


                  {isAdmin && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={handleAtualizarGrupo}
                    >
                      <Text style={[styles.submitButtonText, { color: "#000" }]}>Salvar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowImageModal(false)}
          >
            <Image source={require("./icons/CloseIcon.png")} style={{ width: 35, height: 35, tintColor: '#E0E0E0', }} />
          </TouchableOpacity>
          <ImageZoom
            cropWidth={Dimensions.get('window').width}
            cropHeight={Dimensions.get('window').height}
            imageWidth={Dimensions.get('window').width}
            imageHeight={Dimensions.get('window').height}
          >
            <Image
              source={{ uri: selectedImage }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          </ImageZoom>
        </View>
      </Modal>


      <FlatList
        ref={flatListRef}
        data={mensagens}
        renderItem={renderItem}
        keyExtractor={item => item.mensagemId}
        style={[styles.flatlist, { backgroundColor: theme.background }]}
        inverted={false}
        contentContainerStyle={styles.flatlistContent}
      />


      <View style={[styles.containerManda, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity
          onPress={async () => {
            const base64Image = await pickImageForChat();
            if (base64Image) {
              handleSendImage(base64Image);
            }
          }}
          style={styles.imageButton}
        >
          <Image source={require("./icons/imageicon.png")} style={styles.imageIcon} />
        </TouchableOpacity>
        <View style={styles.mandaMM}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.borderColor
              }
            ]}
            placeholder="Digite sua mensagem"
            value={novaMensagem}
            onChangeText={setNovaMensagem}
            placeholderTextColor={theme.text}
            editable={!isLoading}
          />
        </View>
        <TouchableOpacity
          onPress={enviarMensagem}
          style={styles.bordaEnvia}
          disabled={isLoading}
        >
          <Image source={require("./icons/SetaPretaDireita.png")} style={styles.enviarIcon} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  timestampText: {
    alignSelf: 'flex-end',
    fontFamily: 'Inter-Regular',
    fontSize: 10,
  },
  fotoPerfil: {
    height: 48,
    width: 48,
    marginLeft: 10,
    borderRadius: 30,
  },
  mandaMM: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pagina: {
    flex: 1,
    backgroundColor: "#ffffff",
    color: "white",
    justifyContent: 'center',
    alignItems: 'center',
  },
  cabeca: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 63,
    backgroundColor: "#5FFF72",
    borderRadius: 40,
    width: '98%',
    marginBottom: 5,
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    color: "#000",
    marginLeft: 10,
    fontWeight: "100",
    fontFamily: 'Inter-Regular',
  },
  flatlist: {
    backgroundColor: "#ffffff",
    height: 50,
    width: '99%',
    padding: 0,
  },
  configicon: {
    width: 20,
    height: 20,
    borderRadius: 40,
  },
  enviarIcon: {
    height: 21,
    width: 27,
    borderRadius: 0,
  },
  bordaEnvia: {
    width: 45,
    height: 45,
    backgroundColor: "#5CF076",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 0.5,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    marginHorizontal: 5,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  contactMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
    overflow: 'hidden',
    width: '100%',
  },
  userAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 8,
    marginTop: 2,
  },
  userName: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 5,
    fontFamily: 'Inter-Regular',
  },
  messageItem: {
    flex: 1,
    maxWidth: '80%',
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 0,
    borderRadius: 25,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 25,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 0.5,
    fontFamily: 'Inter-Regular',
  },
  contactMessage: {
    backgroundColor: "#5CF076", // balão do contato - verde
    alignSelf: "flex-start",
    borderBottomLeftRadius: 25,
    borderTopLeftRadius: 5,
  },
  userMessage: {
    backgroundColor: "#e5e5ea",
    alignSelf: "flex-end",
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 25,
  },

  messageText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: "#000",
  },
  input: {
    flex: 1,
    height: 45,
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#000",
    marginRight: 10,
    minWidth: '95%',
    fontFamily: 'Inter-Regular',
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 1,
  },
  containerManda: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f1f1f1",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: 'rgba(0, 0, 0, 0.24)',
    borderWidth: 1.2,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
    alignSelf: 'center',
  },
  imageButton2: {
    width: 65,
    height: 65,
    backgroundColor: "#5CF076",
    borderRadius: 95,
    marginVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 0.5,
  },
  imageButton: {
    width: 45,
    height: 45,
    backgroundColor: "#5CF076",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderColor: 'rgba(0, 0, 0, 0.61)',
    borderWidth: 0.5,
  },
  imageIcon: {
    width: 24,
    height: 24,
    tintColor: "#000",
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  flatlistContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  optionsMenu: {
    position: 'absolute',
    top: 63,
    right: 10,
    borderRadius: 10,
    padding: 10,
    width: 150,
    elevation: 5,
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Inter-Regular',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    height: "95%",
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContentInner: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  membrosContainer: {
    marginTop: 20,
  },
  membrosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  membroItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  membroNome: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  membroCargo: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Inter-Regular',
  },
  imageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    color: "white",
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#5FFF72',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  submitButtonText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  CabecaMaisOpcoesDark: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 20, 0.63)',
    height: '120%',
    alignItems: 'center',
    borderRadius: 40,
    transform: [{ translateX: 10 }],
    paddingRight: 20,
    boxShadow: 'rgba(0, 0, 0, 0.5) 15px 11px 0px 0px'
  },
  CabecaMaisOpcoesLight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 20, 0)',
    height: '120%',
    alignItems: 'center',
    borderRadius: 40,
    transform: [{ translateX: 10 }],
    paddingRight: 20,
    boxShadow: ''
  },
  grupoIdContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  grupoIdLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  grupoId: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },
  membrosListaContainer: {
    flex: 1,
    padding: 15,
  },
  membrosListaTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: 'Inter-Regular',
  },
  membrosLista: {
    paddingBottom: 20,
  },
  membroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  membroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  membroInfo: {
    flex: 1,
  },
  membroNome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  membroCargo: {
    fontSize: 14,
    opacity: 0.7,
    fontFamily: 'Inter-Regular',
  },
  promoverButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#5FFF72',
    marginLeft: 10,
  },
  promoverButtonText: {
    color: '#000',
    fontSize: 12,
    padding: 10,
    borderRadius: 30,
    fontFamily: 'Inter-Regular',
  },
  membroActions: {
    flexDirection: 'vertical',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expulsarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#FF4444',
    marginLeft: 10,
  },
  expulsarButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 10,
  },
  configLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  grupoIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  copyButton: {
    padding: 5,
    marginLeft: 10,
  },
  adminSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'Inter-Regular',
  },
  input2: {
    height: 45,
    textAlignVertical: 'top',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontFamily: 'Inter-Regular',
  },
}); 