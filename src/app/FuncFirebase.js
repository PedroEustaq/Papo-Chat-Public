import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  deleteDoc,
  arrayRemove
} from "firebase/firestore";
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { auth, db } from "./firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';



// Função para buscar o ID do usuário pelo nome
export const getUserIdByName = async (name) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("Nenhum usuário encontrado com esse nome.");
      return null;
    }

    // Retorna o ID do primeiro usuário encontrado
    const userDoc = querySnapshot.docs[0]; // Pode haver múltiplos, mas vamos pegar o primeiro
    return userDoc.id; // Retorna o ID do documento
  } catch (error) {
    console.error("Erro ao buscar ID do usuário:", error);
    return null;
  }
};



// Função para buscar mensagens em tempo real
export const getMessages = async (conversationId) => {
  try {
    const conversationRef = doc(db, "messages", conversationId);
    const docSnap = await getDoc(conversationRef);
    
    if (docSnap.exists()) {
      return docSnap.data().messages || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return [];
  }
};

// Função para salvar os dados do usuário no Firestore
export const saveUserToFirestore = async (userId, name, email) => {
  try {
    let numero = Math.floor(1000 + Math.random() * 9000);
    let userExists = true;
    
    while (userExists) {
      const userDocId = name + "#" + numero;
      userExists = await checkUserExists(userDocId);
      if (userExists) {
        numero = Math.floor(1000 + Math.random() * 9000);
      }
    }

    await setDoc(doc(db, "users", name + "#"+ numero), {
      id: name + "#"+ numero,
      idFirestore: userId,
      name,
      email,
      friendRequest: [],
      friends: [],
      blockedContacts: [],
      profileImg: "",
    });
    console.log("Usuário salvo no Firestore!");
  } catch (error) {
    console.error("Erro ao salvar usuário no Firestore:", error);
  }
};

// Função para buscar a lista de contatos do usuário logado
export const getContacts = async () => {
  try {
    // Verifica se o UID está disponível
    if (!auth.currentUser) {
      console.error("Usuário não está autenticado");
      return [];
    }
    const currentUser = auth.currentUser;
    const uid = currentUser.uid;

    
    // Busca o ID customizado
    const userId = await getUserCustomId(uid);

    


    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);






    return userSnap.data().friends;
  } catch (error) {
    console.error("Erro ao buscar contatos:", error);
    console.error("Stack trace:", error.stack);
    return [];
  }
};

export const getProfileImage = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const profileImg = userData.profileImg;

      if (profileImg) {
        return profileImg; // Retorna a URL da imagem de perfil do usuário
      } else {
       
      }
    } else {
      console.error("Usuário não encontrado.");
      
    }
  } catch (error) {
    console.error("Erro ao buscar imagem de perfil:", error);

  }
};

export const removeFriend = async (userId, friendId) => {
  try {
    const userRef = doc(db, "users", userId);
    const friendRef = doc(db, "users", friendId);

    await updateDoc(userRef, {
      friends: arrayRemove(friendId),
    });

    await updateDoc(friendRef, {
      friends: arrayRemove(userId),
    });

    console.log("Amizade removida com sucesso.");
    return true;
  } catch (error) {
    console.error("Erro ao remover amizade:", error);
    return false;
  }
};

export const getUserName = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.name || null; // Retorna o nome ou null se não existir
    } else {
      console.error("Usuário não encontrado.");
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar nome do usuário:", error);
    return null;
  }
};

export const acceptFriendRequest = async (userId, friendId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("Usuário não encontrado.");
      return false;
    }

    const userData = userSnap.data();

    // Verifica se o pedido de amizade existe na lista
    const requestIndex = userData.friendRequest.findIndex(
      (request) => request === friendId
    );

    if (requestIndex === -1) {
      console.error("Pedido de amizade não encontrado.");
      return false;
    }

    // Remove o pedido de amizade da lista
    userData.friendRequest.splice(requestIndex, 1);

    // Adiciona o amigo à lista de amigos
    userData.friends.push(friendId);

    // Atualiza o usuário no Firestore
    await updateDoc(userRef, {
      friendRequest: userData.friendRequest,
      friends: arrayUnion(friendId),
    });

    // Atualiza a lista de amigos do solicitante também
    const friendRef = doc(db, "users", friendId);
    await updateDoc(friendRef, {
      friends: arrayUnion(userId),
    });

    console.log("Pedido de amizade aceito e amigo adicionado.");
    return true;
  } catch (error) {
    console.error("Erro ao aceitar pedido de amizade:", error);
    return false;
  }
};

export const rejectFriendRequest = async (userId, friendId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("Usuário não encontrado.");
      return false;
    }

    const userData = userSnap.data();

    const requestIndex = userData.friendRequest.findIndex(
      (request) => request === friendId
    );

    if (requestIndex === -1) {
      console.error("Pedido de amizade não encontrado.");
      return false;
    }

    // Remove o pedido da lista
    userData.friendRequest.splice(requestIndex, 1);

    // Atualiza a lista no Firestore
    await updateDoc(userRef, {
      friendRequest: userData.friendRequest,
    });

    console.log("Pedido de amizade recusado.");
    return true;
  } catch (error) {
    console.error("Erro ao recusar pedido de amizade:", error);
    return false;
  }
};

export const getFriendRequests = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const friendRequests = userData.friendRequest || [];
      const blockedContacts = userData.blockedContacts || [];

      // Filtra os pedidos de amizade removendo os usuários bloqueados
      const filteredRequests = friendRequests.filter(requestId => !blockedContacts.includes(requestId));

      return filteredRequests;
    }

    return []; // Retorna um array vazio caso não encontre ou não exista
  } catch (error) {
    console.error("Erro ao buscar pedidos de amizade:", error);
    return []; // Retorna um array vazio em caso de erro
  }
};

export const deleteUserCompletely = async (userId) => {
  try {
    // 1. Deletar o documento do usuário da coleção "users"
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    console.log("Usuário deletado da coleção 'users'.");

    // 2. Buscar todas as conversas na coleção "messages" onde ele é user1_id ou user2_id
    const messagesRef = collection(db, "messages");
    const messagesSnapshot = await getDocs(messagesRef);

    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();
      if (data.user1_id === userId || data.user2_id === userId) {
        await deleteDoc(doc(db, "messages", docSnap.id));
      }
    }

    // 3. Deletar o usuário do Firebase Auth (se estiver autenticado no momento)
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      await deleteUser(currentUser);
      console.log("Usuário deletado do Firebase Auth.");
    } else {
      console.warn("Usuário não está autenticado ou não é o atual. Só pode excluir usuários autenticados.");
    }
    await AsyncStorage.setItem('isLoggedIn', 'false');

    return true;
  } catch (error) {
    console.error("Erro ao deletar usuário completamente:", error);
    return false;
  }
};

export const sendFriendRequest = async (currentUserId, friendUserId) => {
  try {
    const friendRef = doc(db, "users", friendUserId);

    // Atualiza o documento do amigo adicionando o currentUserId ao array friendRequest
    await updateDoc(friendRef, {
      friendRequest: arrayUnion(currentUserId),
    });

    console.log("Pedido de amizade enviado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao enviar pedido de amizade:", error);
    return false;
  }
};

export const getLastMessageText = async (currentUserId, friendId) => {
  try {
    const messagesColRef = collection(db, "messages");
    const messagesSnapshot = await getDocs(messagesColRef);

    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();

      // Verifica se ambos os usuários fazem parte da conversa
      const isCurrentUserIn = data.user1_id === currentUserId || data.user2_id === currentUserId;
      const isFriendIn = data.user1_id === friendId || data.user2_id === friendId;

      if (isCurrentUserIn && isFriendIn) {
        const messagesArray = data.messages;

        if (messagesArray.length > 0) {
          const lastMessage = messagesArray[messagesArray.length - 1];

          if (lastMessage.type === 'image') {
            return "📷 Imagem";
          }

          if (lastMessage.text.length > 35) {
            const tam = lastMessage.text.length
            const msgMenor = lastMessage.text.slice(0, 35) + "...";
            return msgMenor
          } else {
            return lastMessage.text;
          }
        } else {
          return null;
        }
      }
    }
    
    // Nenhuma conversa encontrada
    return null;
  } catch (error) {
    console.error("Erro ao buscar última mensagem:", error);
    return null;
  }
};

export const getLastSender = async (currentUserId, friendId) => {
  try {
    const messagesColRef = collection(db, "messages");
    const messagesSnapshot = await getDocs(messagesColRef);

    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();

      // Verifica se ambos os usuários fazem parte da conversa
      const isCurrentUserIn = data.user1_id === currentUserId || data.user2_id === currentUserId;
      const isFriendIn = data.user1_id === friendId || data.user2_id === friendId;

      if (isCurrentUserIn && isFriendIn) {
        const messagesArray = data.messages || [];

        if (messagesArray.length > 0) {
          const lastMessage = messagesArray[messagesArray.length - 1];

          if (lastMessage.userId != currentUserId) {
            return "Vector.png";
          } else {
            return "";
          }
        } else {
          return null;
        }
      }
    }
    

    // Nenhuma conversa encontrada
    return null;
  } catch (error) {
    console.error("Erro ao buscar última mensagem:", error);
    return null;
  }
};
export const getLastTimestap = async (currentUserId, friendId) => {
  try {
    const messagesColRef = collection(db, "messages");
    const messagesSnapshot = await getDocs(messagesColRef);

    for (const docSnap of messagesSnapshot.docs) {
      const data = docSnap.data();

      // Verifica se ambos os usuários fazem parte da conversa
      const isCurrentUserIn = data.user1_id === currentUserId || data.user2_id === currentUserId;
      const isFriendIn = data.user1_id === friendId || data.user2_id === friendId;

      if (isCurrentUserIn && isFriendIn) {
        const messagesArray = data.messages || [];

        if (messagesArray.length > 0) {
          const lastMessage = messagesArray[messagesArray.length - 1];

          return lastMessage.timestamp.split("T")[1].split(".")[0] || null;
        } else {
          return null;
        }
      }
    }

    // Nenhuma conversa encontrada
    return null;
  } catch (error) {
    console.error("Erro ao buscar última mensagem:", error);
    return null;
  }
};

//Atualiza Imagem perfil Chatscreen
export const updateContactProfileImg = async (contactId) => {
  try {
    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);

    // Busca o contato pelo ID
    const contactRef = doc(db, "users", contactId);
    const contactSnap = await getDoc(contactRef);

    if (!contactSnap.exists()) {
      console.error("Contato não encontrado.");
      return false;
    }

    const contactProfileImg = contactSnap.data().profileImg; // Obtém o profileImg do contato

    // Obtemos os dados do usuário atual
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    // Verifica se o contato já existe na lista
    const contactIndex = userData.contacts.findIndex(contact => contact.id === contactId);

    if (contactIndex !== -1) {
      // Se o contato existir, atualize o profileImg
      userData.contacts[contactIndex].profileImg = contactProfileImg;

      // Atualiza o usuário no Firestore com a nova lista de contatos
      await updateDoc(userRef, {
        contacts: userData.contacts,
      });

      console.log("ProfileImg do contato atualizado.");
    } else {
      // Se o contato não existir, adicionamos um novo
      await updateDoc(userRef, {
        contacts: arrayUnion({
          id: contactId,
          name: contactSnap.data().name,
          profileImg: contactProfileImg, // Adiciona o novo profileImg
        }),
      });

      console.log("Novo contato adicionado.");
    }

    return true;
  } catch (error) {
    console.error("Erro ao atualizar a imagem de perfil:", error);
    return false;
  }
};

export const getUserCustomId = async (userId) => {
  try {
    
    // Busca todos os documentos na coleção users
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("idFirestore", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Pega o primeiro documento que corresponde à query
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.id) {
        return userData.id;
      } else {
        console.log("Campo 'id' não encontrado nos dados do usuário");
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar ID customizado do usuário:", error);
    return null;
  }
};

export const pickImageAndConvertToBase64 = async () => {
    try {
        // Solicitar permissão para acessar a galeria
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (!permissionResult.granted) {
            Alert.alert("Permissão necessária", "Você precisa permitir o acesso à galeria para selecionar uma imagem.");
            return null;
        }

        // Abrir o seletor de imagens com qualidade reduzida
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            base64: true,
            quality: 0.3, // Reduzindo a qualidade para 30%
            maxWidth: 800, // Limitando a largura máxima
            maxHeight: 800, // Limitando a altura máxima
        });

        if (!result.canceled) {
            // Converter a imagem para base64 PNG
            const base64Img = `data:image/png;base64,${result.assets[0].base64}`;
            
            try {
                const userId = await getUserCustomId(auth.currentUser.uid);
                if (userId) {
                    Alert.alert("Sucesso", "Imagem de perfil atualizada com sucesso!");
                } else {
                    Alert.alert("Erro", "Não foi possível encontrar o ID do usuário");
                }
            } catch (error) {
                console.error("Erro ao atualizar imagem:", error);
                Alert.alert("Erro", "Não foi possível atualizar a imagem de perfil");
            }
            return base64Img;
        }

        return null;
    } catch (error) {
        console.error("Erro ao selecionar imagem:", error);
        Alert.alert("Erro", "Não foi possível selecionar a imagem.");
        return null;
    }
};

export const updateProfileImage = async (userId, base64Image) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            profileImg: base64Image
        });
        console.log("Imagem de perfil atualizada com sucesso!");
        return true;
    } catch (error) {
        console.error("Erro ao atualizar imagem de perfil:", error);
        return false;
    }
};

export const checkUserExists = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error("Erro ao verificar existência do usuário:", error);
    return false;
  }
};



export const blockContact = async (currentUserId, contactId) => {
  try {
    const userRef = doc(db, "users", currentUserId);
    const contactRef = doc(db, "users", contactId);
    
    // Adiciona o contato ao array blockedContacts e remove da lista de amigos
    await updateDoc(userRef, {
      blockedContacts: arrayUnion(contactId),
    });
    await updateDoc(contactRef, {
      blockedContacts: arrayUnion(currentUserId),
    });

    // Remove o usuário atual da lista de amigos do contato
    await updateDoc(contactRef, {
    });

    console.log("Contato bloqueado e removido dos amigos com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao bloquear contato:", error);
    return false;
  }
};

export const saveReport = async (currentUserId, reportedUserId, reason) => {
  try {
    const reportRef = doc(db, "Sistema", "Denuncias");
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      // Se o documento não existir, cria com a primeira denúncia
      await setDoc(reportRef, {
        [reportedUserId]: [{
          denunciado: reportedUserId,
          motivo: reason,
          denunciante: currentUserId,
          timestamp: new Date().toISOString()
        }]
      });
    } else {
      // Se o documento existir, adiciona a nova denúncia ao array existente
      const currentData = reportSnap.data();
      const existingReports = currentData[reportedUserId] || [];

      await updateDoc(reportRef, {
        [reportedUserId]: [...existingReports, {
          denunciado: reportedUserId,
          motivo: reason,
          denunciante: currentUserId,
          timestamp: new Date().toISOString()
        }]
      });
    }

    console.log("Denúncia salva com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao salvar denúncia:", error);
    return false;
  }
};

export const pickImageForChat = async () => {
    try {
        // Solicitar permissão para acessar a galeria
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (!permissionResult.granted) {
            Alert.alert("Permissão necessária", "Você precisa permitir o acesso à galeria para selecionar uma imagem.");
            return null;
        }

        // Abrir o seletor de imagens com qualidade reduzida
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            base64: true,
            quality: 0.3, // Reduzindo a qualidade para 30%
            maxWidth: 800, // Limitando a largura máxima
            maxHeight: 800, // Limitando a altura máxima
        });

        if (!result.canceled) {
            // Converter a imagem para base64 PNG
            const base64Img = `data:image/png;base64,${result.assets[0].base64}`;
            return base64Img;
        }

        return null;
    } catch (error) {
        console.error("Erro ao selecionar imagem:", error);
        Alert.alert("Erro", "Não foi possível selecionar a imagem.");
        return null;
    }
};



