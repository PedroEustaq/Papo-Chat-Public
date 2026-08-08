import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput,  FlatList, StyleSheet, TouchableOpacity, Image, Modal, Animated, Alert, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { useRoute } from "@react-navigation/native";
import { db } from "./firebase";
import { doc, collection, query, where, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc, arrayRemove } from "firebase/firestore";
import { getUserName, getSystemVersion, blockContact, saveReport, pickImageForChat } from "./FuncFirebase";
import { useNavigation } from "@react-navigation/native"; // Importa useNavigation
import { useTheme } from './ThemeContext';
import ImageZoom from 'react-native-image-pan-zoom';

export default function PrivateChat() {
  const navigation = useNavigation(); // Obtém a navegação
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const route = useRoute();
  const { userId, contactId, profileId } = route.params;
  const [conversationId, setConversationId] = useState("");
  const [contactName, setContactName] = useState("Carregando..."); // Novo estado para nome
  const flatListRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(-20)).current;
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  //Rolar para baixo
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  //Pegar conversa
  useEffect(() => {
    const fetchConversationId = async () => {
      const messagesQuery = query(
        collection(db, "messages"),
        where("user1_id", "in", [userId, contactId]),
        where("user2_id", "in", [userId, contactId])
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        if (!snapshot.empty) {
          const conversation = snapshot.docs[0];
          setConversationId(conversation.id);
          setMessages(conversation.data().messages || []);

          // Rola para baixo após um pequeno delay para garantir que os dados foram renderizados
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }, 500);
        } else {
          const newConversationRef = doc(collection(db, "messages"));
          const newConversationId = newConversationRef.id;
          setConversationId(newConversationId);

          await setDoc(newConversationRef, {
            user1_id: userId,
            user2_id: contactId,
            messages: [],
          });
        }
      });

      return () => unsubscribe();
    };

    fetchConversationId();
  }, [userId, contactId]);

  //Pegar nome do contato
  useEffect(() => {
    const fetchContactName = async () => {
      const name = await getUserName(contactId);
      setContactName(name);
    };

    fetchContactName();
  }, [contactId]);

  // Adicionar useEffect para verificar se o contato está bloqueado
  useEffect(() => {
    const checkIfBlocked = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const blockedContacts = userSnap.data().blockedContacts ;
          const isContactBlocked = blockedContacts.includes(contactId);
          setIsBlocked(isContactBlocked);
          
        
        }
      } catch (error) {
      }
    };

    checkIfBlocked();
  }, [userId, contactId]);

  //Enviar mensagem
  const handleSendMessage = async () => {
    if (isBlocked) {
      Alert.alert(
        "Contato Bloqueado",
        "Você não pode enviar mensagens para este contato pois ele está bloqueado."
      );
      return;
    }

    if (!newMessage.trim()) {
      alert("Digite uma mensagem!");
      return;
    }

    try {
      if (!conversationId) {
        alert("Conversa não encontrada!");
        return;
      }

      const chatDocRef = doc(db, "messages", conversationId);
      await updateDoc(chatDocRef, {
        messages: arrayUnion({
          userId,
          text: newMessage,
          timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(),
        }),
      });
      setNewMessage("");
    } catch (error) {
      alert("Não foi possível enviar a mensagem.");
      console.error(error);
    }
  };

  // Adicionar função para enviar imagem
  const handleSendImage = async (base64Image) => {
    if (isBlocked) {
      Alert.alert(
        "Contato Bloqueado",
        "Você não pode enviar mensagens para este contato pois ele está bloqueado."
      );
      return;
    }

    try {
      if (!conversationId) {
        alert("Conversa não encontrada!");
        return;
      }

      const chatDocRef = doc(db, "messages", conversationId);
      await updateDoc(chatDocRef, {
        messages: arrayUnion({
          userId,
          type: 'image',
          imageUrl: base64Image,
          timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(),
        }),
      });
    } catch (error) {
      alert("Não foi possível enviar a imagem.");
      console.error(error);
    }
  };

  const handleOptionsPress = () => {
    if (showOptions) {
      // Animar para fechar
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowOptions(false);
      });
    } else {
      setShowOptions(true);
      // Animar para abrir
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleBlockContact = async () => {
    try {
      if (isBlocked) {
        // Desbloquear contato
        const userRef = doc(db, "users", userId);
        const contactRef = doc(db, "users", contactId);
        
        // Atualizar lista de bloqueados do usuário atual
        await updateDoc(userRef, {
          blockedContacts: arrayRemove(contactId)
        });
        
        // Atualizar lista de bloqueados do contato
        await updateDoc(contactRef, {
          blockedContacts: arrayRemove(userId)
        });
        
        setIsBlocked(false);
      } else {
        // Bloquear contato (código existente)
        const success = await blockContact(userId, contactId);
        if (success) {
          setIsBlocked(true);
        } else {
          Alert.alert("Erro", "Não foi possível bloquear o contato.");
        }
      }
    } catch (error) {
      console.error("Erro ao gerenciar bloqueio:", error);
      Alert.alert("Erro", "Ocorreu um erro ao tentar gerenciar o bloqueio do contato.");
    }
  };

  const handleReport = () => {
    setShowOptions(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      Alert.alert("Erro", "Por favor, descreva o motivo da denúncia.");
      return;
    }
    setShowReportModal(false);
    try {
      const success = await saveReport(userId, contactId, reportText.trim());
      
      if (success) {
        Alert.alert(
          "Sucesso",
          "Denúncia enviada com sucesso!",
          [
            {
              text: "OK",
              onPress: () => {
                setShowReportModal(false);
                setReportText("");
              }
            }
          ]
        );
      } else {
        Alert.alert("Erro", "Não foi possível enviar a denúncia.");
      }
    } catch (error) {
      console.error("Erro ao enviar denúncia:", error);
      Alert.alert("Erro", "Ocorreu um erro ao tentar enviar a denúncia.");
    }
  };

  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  return (
    <View style={[styles.pagina, { backgroundColor: theme.background }]}>
      <View style={[styles.cabeca, isDarkMode ? { backgroundColor: theme.cardBackground} : { backgroundColor: "#00FF4C" }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image source={require("./icons/ArrowLeft.png")} style={[styles.configicon, isDarkMode ? {tintColor: theme.text} : {tintColor: theme.text}]} />
        </TouchableOpacity>
        <Image
          style={styles.fotoPerfil}
          source={
            profileId
              ? { uri: profileId }
              : require("./decoracoes/TravelerIcon.png")
          }
        />

        <Text style={[styles.title, { color: theme.text }]}>{contactName}</Text>
        <View style={isDarkMode ? styles.CabecaMaisOpcoesDark : styles.CabecaMaisOpcoesLight}>
          <TouchableOpacity onPress={handleOptionsPress}>
            <Image source={require("./icons/options-vertical.png")} style={[styles.configicon, {tintColor: theme.text}]} />
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
            <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
              <Text style={[styles.optionText, { color: theme.text }]}>Denunciar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={handleBlockContact}>
              <Text style={[styles.optionText, { color: theme.text }]}>{isBlocked ? "Desbloquear" : "Bloquear"}</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Denunciar Usuário</Text>
            
            <TextInput
              style={[styles.reportInput, { 
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.borderColor
              }]}
              placeholder="Descreva o motivo da denúncia..."
              value={reportText}
              onChangeText={setReportText}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={theme.text}
            />

            <TouchableOpacity 
              style={styles.blockButton}
              onPress={handleBlockContact}
            >
              <Text style={styles.blockButtonText}>Bloquear Usuário</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportText("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitReport}
              >
                <Text style={[styles.submitButtonText, { color: "#000" }]}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
            <Image source={require("./icons/CloseIcon.png")} style={{width: 35, height: 35, tintColor: '#E0E0E0',}}/>
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
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const isUserMessage = item.userId === userId;
          return (
            <View
              style={[
                styles.messageItem,
                isUserMessage ? styles.userMessage : styles.contactMessage,
                { backgroundColor: isUserMessage ? theme.cardBackground : "#5CF076" }
              ]}
            >
              {item.type === 'image' ? (
                <TouchableOpacity onPress={() => handleImagePress(item.imageUrl)}>
                  <Image 
                    source={{ uri: item.imageUrl }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <Text style={[styles.messageText, { color: isUserMessage ? theme.text : "#000" }]}>
                  {item.text}
                </Text>
              )}
              <Text style={[styles.timestampText, { color: isUserMessage ? theme.text : "#000" }]}>
                {item.timestamp.split("T")[1].split(".")[0].slice(0,-3)}
              </Text>
            </View>
          );
        }}
        inverted={false}
        style={[styles.flatlist, { backgroundColor: theme.background }]}
      />
      <View style={[styles.containerManda, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity 
          onPress={async () => {
            const base64Image = await pickImageForChat();
            if (base64Image) {
              handleSendImage(base64Image);
            }
          }}
          style={[styles.imageButton, isBlocked && styles.imageButtonBlocked]}
          disabled={isBlocked}
        >
          <Image 
            source={require("./icons/imageicon.png")} 
            style={[styles.imageIcon, isBlocked && styles.imageIconBlocked]} 
          />
        </TouchableOpacity>
        <View style={styles.mandaMM}>
          <TextInput
            style={[
              styles.input, 
              isBlocked && styles.inputBlocked,
              { 
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.borderColor
              }
            ]}
            placeholder={isBlocked ? "Você bloqueou este usuário" : "Digite sua mensagem"}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholderTextColor={theme.text}
            editable={!isBlocked}
          />
        </View>
        <TouchableOpacity 
          onPress={handleSendMessage} 
          style={[styles.bordaEnvia, isBlocked && styles.bordaEnviaBlocked]}
          disabled={isBlocked}
        >
          <Image source={require("./icons/SetaPretaDireita.png")} style={styles.enviarIcon} />
        </TouchableOpacity>
      </View>
    </View>
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
  messageItem: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 5,
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
  userMessage: {
    backgroundColor: "#e5e5ea", // balão do usuário - cinza
    alignSelf: "flex-end",
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 25,
    
  },
  contactMessage: {
    backgroundColor: "#5CF076", // balão do contato - verde
    alignSelf: "flex-start",
    borderBottomLeftRadius: 5,
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

  optionsMenu: {
    position: 'absolute',
    top: 63,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: 150,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  reportInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
    fontFamily: 'Inter-Regular',
  },
  blockButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  blockButtonText: {
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: 'rgba(126, 126, 126, 0.14)',
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
  inputBlocked: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  bordaEnviaBlocked: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  CabecaMaisOpcoesDark: {
    flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(20, 20, 20, 0.63)', height: '120%', alignItems: 'center', borderRadius: 40, transform: [{translateX: 10}], paddingRight: 20, boxShadow: 'rgba(0, 0, 0, 0.5) 15px 11px 0px 0px'
  },
  CabecaMaisOpcoesLight: {
    flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(20, 20, 20, 0)', height: '120%', alignItems: 'center', borderRadius: 40, transform: [{translateX: 10}], paddingRight: 20, boxShadow: ''
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
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
    top: 40,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageButtonBlocked: {
    backgroundColor: '#999',
    opacity: 1,
  },
  imageIconBlocked: {
    tintColor: '#222',
  },
});


