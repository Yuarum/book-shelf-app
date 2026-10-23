import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  FlatList,
  Modal,
} from 'react-native';

export default function Index() {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'search' | 'settings'

  // Dinamik Veri Yapısı: Kitaplıklar -> Raflar -> Kitaplar (Sıra Numaralı)
  const [libraries, setLibraries] = useState([
    {
      id: 'lib-1',
      name: 'Salon Kitaplığı',
      shelves: [
        {
          id: 'shelf-1',
          name: '1. Raf',
          books: [
            { id: 'b-1', title: 'Dune', orderNo: '1' },
            { id: 'b-2', title: '1984', orderNo: '5' },
          ],
        },
        {
          id: 'shelf-2',
          name: '2. Raf',
          books: [{ id: 'b-3', title: 'Simyacı', orderNo: '2' }],
        },
      ],
    },
    {
      id: 'lib-2',
      name: 'Oyun / Çalışma Odası',
      shelves: [
        {
          id: 'shelf-3',
          name: 'Oyun Rafı',
          books: [
            { id: 'b-4', title: 'The Witcher 3', orderNo: '1' },
            { id: 'b-5', title: 'Elden Ring', orderNo: '2' },
          ],
        },
      ],
    },
  ]);

  // Navigasyon State'leri
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [selectedShelf, setSelectedShelf] = useState(null);

  // Modal State'leri
  const [modalType, setModalType] = useState(null); // 'library' | 'shelf' | 'book'
  const [newItemName, setNewItemName] = useState('');
  const [newOrderNo, setNewOrderNo] = useState(''); // Kitap sırası için yeni state

  // Arama State'i
  const [searchQuery, setSearchQuery] = useState('');

  // --- EKLEME FONKSİYONLARI ---
  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    if (modalType === 'library') {
      const newLib = { id: Date.now().toString(), name: newItemName, shelves: [] };
      setLibraries([...libraries, newLib]);
    } else if (modalType === 'shelf' && selectedLibrary) {
      const newShelf = { id: Date.now().toString(), name: newItemName, books: [] };
      const updated = libraries.map((lib) =>
          lib.id === selectedLibrary.id
              ? { ...lib, shelves: [...lib.shelves, newShelf] }
              : lib
      );
      setLibraries(updated);
      setSelectedLibrary({ ...selectedLibrary, shelves: [...selectedLibrary.shelves, newShelf] });
    } else if (modalType === 'book' && selectedLibrary && selectedShelf) {
      const newBook = {
        id: Date.now().toString(),
        title: newItemName,
        orderNo: newOrderNo.trim() || '1', // Varsayılan 1. kitap
      };
      const updated = libraries.map((lib) => {
        if (lib.id === selectedLibrary.id) {
          const updatedShelves = lib.shelves.map((sh) =>
              sh.id === selectedShelf.id ? { ...sh, books: [...sh.books, newBook] } : sh
          );
          return { ...lib, shelves: updatedShelves };
        }
        return lib;
      });
      setLibraries(updated);
      setSelectedShelf({ ...selectedShelf, books: [...selectedShelf.books, newBook] });
    }

    setNewItemName('');
    setNewOrderNo('');
    setModalType(null);
  };

  // --- AKILLI ARAMA MANTIGI ---
  const getAllBooksWithLocation = () => {
    let result = [];
    libraries.forEach((lib) => {
      lib.shelves.forEach((sh) => {
        sh.books.forEach((bk) => {
          result.push({
            id: bk.id,
            title: bk.title,
            orderNo: bk.orderNo,
            libraryName: lib.name,
            shelfName: sh.name,
          });
        });
      });
    });
    return result;
  };

  const filteredSearchBooks = getAllBooksWithLocation().filter((b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <SafeAreaView style={styles.container}>
        {!isBookOpen ? (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.coverOverlay}
                onPress={() => setIsBookOpen(true)}
            >
              <Text style={styles.coverTitle}>KİŞİSEL KİTAPLIĞIM</Text>
              <Text style={styles.coverInstruction}>Kapağı açmak için dokunun ◄</Text>
            </TouchableOpacity>
        ) : (
            <View style={styles.mainContent}>
              <View style={styles.pageBody}>
                {activeTab === 'library' && (
                    <View style={styles.tabContent}>
                      {/* LEVEL 1: Kitaplıklar */}
                      {!selectedLibrary && (
                          <>
                            <View style={styles.headerRow}>
                              <Text style={styles.title}>🏛️ Kitaplıklar</Text>
                              <TouchableOpacity
                                  style={styles.addMiniButton}
                                  onPress={() => setModalType('library')}
                              >
                                <Text style={styles.addMiniButtonText}>+ Kitaplık Ekle</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={libraries}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.card}
                                        onPress={() => setSelectedLibrary(item)}
                                    >
                                      <Text style={styles.cardTitle}>{item.name}</Text>
                                      <Text style={styles.cardSubtitle}>
                                        {item.shelves.length} adet raf var ➔
                                      </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                  <Text style={styles.emptyText}>Henüz hiç kitaplık eklenmedi.</Text>
                                }
                            />
                          </>
                      )}

                      {/* LEVEL 2: Raflar */}
                      {selectedLibrary && !selectedShelf && (
                          <>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setSelectedLibrary(null)}
                            >
                              <Text style={styles.backButtonText}>⬅ Kitaplıklara Dön</Text>
                            </TouchableOpacity>

                            <View style={styles.headerRow}>
                              <Text style={styles.title}>📂 {selectedLibrary.name}</Text>
                              <TouchableOpacity
                                  style={styles.addMiniButton}
                                  onPress={() => setModalType('shelf')}
                              >
                                <Text style={styles.addMiniButtonText}>+ Raf Ekle</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={selectedLibrary.shelves}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.card, { borderLeftColor: '#E67E22' }]}
                                        onPress={() => setSelectedShelf(item)}
                                    >
                                      <Text style={styles.cardTitle}>{item.name}</Text>
                                      <Text style={styles.cardSubtitle}>
                                        {item.books.length} adet kitap/oyun var ➔
                                      </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                  <Text style={styles.emptyText}>Bu kitaplıkta raf yok.</Text>
                                }
                            />
                          </>
                      )}

                      {/* LEVEL 3: Kitaplar (Sıra Nolu Gösterim) */}
                      {selectedLibrary && selectedShelf && (
                          <>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setSelectedShelf(null)}
                            >
                              <Text style={styles.backButtonText}>⬅ Raflara Dön</Text>
                            </TouchableOpacity>

                            <View style={styles.headerRow}>
                              <Text style={styles.title}>📖 {selectedShelf.name}</Text>
                              <TouchableOpacity
                                  style={styles.addMiniButton}
                                  onPress={() => setModalType('book')}
                              >
                                <Text style={styles.addMiniButtonText}>+ Kitap/Oyun Ekle</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={selectedShelf.books}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <View style={[styles.card, { borderLeftColor: '#2ECC71' }]}>
                                      <Text style={styles.cardTitle}>{item.title}</Text>
                                      <Text style={styles.cardSubtitle}>
                                        📍 Konum: <Text style={styles.highlight}>{selectedShelf.name}</Text>'in{' '}
                                        <Text style={styles.highlight}>{item.orderNo}. kitabı</Text>
                                      </Text>
                                    </View>
                                )}
                                ListEmptyComponent={
                                  <Text style={styles.emptyText}>Bu rafta henüz kitap/oyun yok.</Text>
                                }
                            />
                          </>
                      )}
                    </View>
                )}

                {/* 🔍 ARAMA EKRANI */}
                {activeTab === 'search' && (
                    <View style={styles.tabContent}>
                      <Text style={styles.title}>🔍 Akıllı Arama</Text>
                      <TextInput
                          style={styles.searchInput}
                          placeholder="Kitap veya oyun adı arayın..."
                          placeholderTextColor="#888"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                      />

                      <FlatList
                          data={filteredSearchBooks}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                              <View style={[styles.card, { borderLeftColor: '#3498DB' }]}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardSubtitle}>
                                  📍 <Text style={styles.highlight}>{item.libraryName}</Text> ➔{' '}
                                  <Text style={styles.highlight}>{item.shelfName}</Text>'in{' '}
                                  <Text style={styles.highlight}>{item.orderNo}. kitabı</Text>
                                </Text>
                              </View>
                          )}
                          ListEmptyComponent={
                            <Text style={styles.emptyText}>
                              {searchQuery ? 'Aradığınız öge bulunamadı.' : 'Arama yapmak için yukarıya yazın.'}
                            </Text>
                          }
                      />
                    </View>
                )}

                {/* ⚙️ AYARLAR EKRANI */}
                {activeTab === 'settings' && (
                    <View style={styles.tabContent}>
                      <Text style={styles.title}>⚙️ Ayarlar</Text>
                      <TouchableOpacity
                          style={styles.closeCoverButton}
                          onPress={() => {
                            setIsBookOpen(false);
                            setSelectedLibrary(null);
                            setSelectedShelf(null);
                          }}
                      >
                        <Text style={styles.closeCoverText}>📖 Kapağı Kapat</Text>
                      </TouchableOpacity>
                    </View>
                )}
              </View>

              {/* DİKEY AYRAÇLAR */}
              <View style={styles.bookmarkContainer}>
                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#E74C3C' },
                      activeTab === 'library' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('library')}
                >
                  <Text style={styles.bookmarkText}>Kitaplık</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#3498DB' },
                      activeTab === 'search' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('search')}
                >
                  <Text style={styles.bookmarkText}>Arama</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                      styles.bookmark,
                      { backgroundColor: '#2ECC71' },
                      activeTab === 'settings' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('settings')}
                >
                  <Text style={styles.bookmarkText}>Ayarlar</Text>
                </TouchableOpacity>
              </View>
            </View>
        )}

        {/* DİNAMİK EKLEME MODALI */}
        <Modal visible={!!modalType} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {modalType === 'library' && 'Yeni Kitaplık Oluştur'}
                {modalType === 'shelf' && 'Yeni Raf Oluştur'}
                {modalType === 'book' && 'Yeni Kitap / Oyun Ekle'}
              </Text>

              <TextInput
                  style={styles.modalInput}
                  placeholder={
                    modalType === 'library'
                        ? 'Örn: Salon Kitaplığı'
                        : modalType === 'shelf'
                            ? 'Örn: 1. Raf'
                            : 'Kitap / Oyun Adı (Örn: 1984)'
                  }
                  value={newItemName}
                  onChangeText={setNewItemName}
              />

              {/* Sadece Kitap Eklerken Sıra Numarası İnputu Görünür */}
              {modalType === 'book' && (
                  <TextInput
                      style={styles.modalInput}
                      placeholder="Raftaki Sırası (Örn: 5)"
                      keyboardType="numeric"
                      value={newOrderNo}
                      onChangeText={setNewOrderNo}
                  />
              )}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                    onPress={() => setModalType(null)}
                >
                  <Text style={styles.modalButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#2ECC71' }]}
                    onPress={handleAddItem}
                >
                  <Text style={styles.modalButtonText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EBE0',
  },
  coverOverlay: {
    flex: 1,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F1C40F',
    letterSpacing: 2,
    marginBottom: 20,
  },
  coverInstruction: {
    fontSize: 14,
    color: '#BDC3C7',
    fontStyle: 'italic',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  pageBody: {
    flex: 1,
    padding: 15,
  },
  tabContent: {
    flex: 1,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#2980B9',
    fontWeight: 'bold',
  },
  addMiniButton: {
    backgroundColor: '#8E44AD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addMiniButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#8E44AD',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 15,
    marginBottom: 15,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#2980B9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 30,
  },
  closeCoverButton: {
    backgroundColor: '#C0392B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeCoverText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  bookmarkContainer: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  bookmark: {
    width: 45,
    paddingVertical: 18,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBookmark: {
    width: 55,
  },
  bookmarkText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
    transform: [{ rotate: '90deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2C3E50',
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});