import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@book_shelf_data_v1';
const TYPES_KEY = '@book_shelf_types_v1';

export default function Index() {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('library');

  // Tür Prefab'leri
  const [itemTypes, setItemTypes] = useState(['Kitap', 'Oyun', 'Dergi', 'Manga']);
  const [newTypeName, setNewTypeName] = useState('');

  // Veri Yapısı
  const [libraries, setLibraries] = useState([]);

  // Navigasyon State'leri
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [selectedShelf, setSelectedShelf] = useState(null);

  // Ekleme Modalı State'leri
  const [modalType, setModalType] = useState(null); // 'library' | 'shelf' | 'item'
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedType, setSelectedType] = useState('Kitap');
  const [newOrderNo, setNewOrderNo] = useState('');

  // Detay / Düzenleme Modalı State'leri
  const [detailItem, setDetailItem] = useState(null);
  const [editStatus, setEditStatus] = useState('Başlanmadı'); // 'Okunuyor/Oynanıyor' | 'Tamamlandı' | 'İstek Listesi'
  const [editProgress, setEditProgress] = useState('');
  const [editNote, setEditNote] = useState('');

  // Arama State'i
  const [searchQuery, setSearchQuery] = useState('');

  // --- 1. ASYNCSTORAGE (VERİ YÜKLEME VE KAYDETME) ---
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [libraries, itemTypes]);

  const loadData = async () => {
    try {
      const savedLibs = await AsyncStorage.getItem(STORAGE_KEY);
      const savedTypes = await AsyncStorage.getItem(TYPES_KEY);

      if (savedLibs) setLibraries(JSON.parse(savedLibs));
      else {
        // İlk Kurulum Örnek Verisi
        setLibraries([
          {
            id: 'lib-1',
            name: 'Salon Kitaplığı',
            shelves: [
              {
                id: 'shelf-1',
                name: '1. Raf',
                items: [
                  { id: 'i-1', title: 'Dune', type: 'Kitap', orderNo: '1', status: 'Okunuyor', progress: 'Sayfa 120', note: 'Harika gidiyor' },
                  { id: 'i-2', title: '1984', type: 'Kitap', orderNo: '2', status: 'Tamamlandı', progress: '', note: '' },
                ],
              },
            ],
          },
        ]);
      }

      if (savedTypes) setItemTypes(JSON.parse(savedTypes));
    } catch (e) {
      console.error('Veri yükleme hatası:', e);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(libraries));
      await AsyncStorage.setItem(TYPES_KEY, JSON.stringify(itemTypes));
    } catch (e) {
      console.error('Veri kaydetme hatası:', e);
    }
  };

  // --- 2. SIRA DEĞİŞTİRME (YUKARI / AŞAĞI) ---
  const moveItemOrder = (itemId, direction) => {
    if (!selectedLibrary || !selectedShelf) return;

    const currentItems = [...selectedShelf.items];
    const index = currentItems.findIndex((it) => it.id === itemId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    // Elemanların yerini değiştir
    const temp = currentItems[index];
    currentItems[index] = currentItems[targetIndex];
    currentItems[targetIndex] = temp;

    // Sıra numaralarını otomatik güncelle
    const updatedItems = currentItems.map((it, idx) => ({ ...it, orderNo: (idx + 1).toString() }));

    updateShelfItems(updatedItems);
  };

  const updateShelfItems = (newItems) => {
    const updatedLibs = libraries.map((lib) => {
      if (lib.id === selectedLibrary.id) {
        const updatedShelves = lib.shelves.map((sh) =>
            sh.id === selectedShelf.id ? { ...sh, items: newItems } : sh
        );
        return { ...lib, shelves: updatedShelves };
      }
      return lib;
    });

    setLibraries(updatedLibs);
    setSelectedShelf({ ...selectedShelf, items: newItems });
  };

  // --- 3. SİLME İŞLEMLERİ ---
  const deleteLibrary = (libId) => {
    const updated = libraries.filter((l) => l.id !== libId);
    setLibraries(updated);
  };

  const deleteShelf = (shelfId) => {
    const updatedShelves = selectedLibrary.shelves.filter((s) => s.id !== shelfId);
    const updatedLibs = libraries.map((lib) =>
        lib.id === selectedLibrary.id ? { ...lib, shelves: updatedShelves } : lib
    );
    setLibraries(updatedLibs);
    setSelectedLibrary({ ...selectedLibrary, shelves: updatedShelves });
  };

  const deleteItem = (itemId) => {
    const updatedItems = selectedShelf.items.filter((i) => i.id !== itemId);
    updateShelfItems(updatedItems);
  };

  // --- 4. YENİ ÖĞE / RAF / KİTAPLIK EKLEME ---
  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    if (modalType === 'library') {
      const newLib = { id: Date.now().toString(), name: newItemTitle, shelves: [] };
      setLibraries([...libraries, newLib]);
    } else if (modalType === 'shelf' && selectedLibrary) {
      const newShelf = { id: Date.now().toString(), name: newItemTitle, items: [] };
      const updated = libraries.map((lib) =>
          lib.id === selectedLibrary.id ? { ...lib, shelves: [...lib.shelves, newShelf] } : lib
      );
      setLibraries(updated);
      setSelectedLibrary({ ...selectedLibrary, shelves: [...selectedLibrary.shelves, newShelf] });
    } else if (modalType === 'item' && selectedLibrary && selectedShelf) {
      const calculatedOrder = newOrderNo.trim() || (selectedShelf.items.length + 1).toString();
      const newItem = {
        id: Date.now().toString(),
        title: newItemTitle,
        type: selectedType,
        orderNo: calculatedOrder,
        status: 'Başlanmadı',
        progress: '',
        note: '',
      };

      const updatedItems = [...selectedShelf.items, newItem];
      updateShelfItems(updatedItems);
    }

    setNewItemTitle('');
    setNewOrderNo('');
    setModalType(null);
  };

  // --- 5. DETAY VE NOT KAYDETME ---
  const openDetailModal = (item) => {
    setDetailItem(item);
    setEditStatus(item.status || 'Başlanmadı');
    setEditProgress(item.progress || '');
    setEditNote(item.note || '');
  };

  const saveItemDetails = () => {
    if (!detailItem || !selectedShelf) return;

    const updatedItems = selectedShelf.items.map((it) =>
        it.id === detailItem.id
            ? { ...it, status: editStatus, progress: editProgress, note: editNote }
            : it
    );

    updateShelfItems(updatedItems);
    setDetailItem(null);
  };

  // Tür Prefab Ekleme
  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    if (!itemTypes.includes(newTypeName.trim())) {
      setItemTypes([...itemTypes, newTypeName.trim()]);
      setSelectedType(newTypeName.trim());
    }
    setNewTypeName('');
  };

  // Arama Fonksiyonu
  const getAllItemsWithLocation = () => {
    let result = [];
    libraries.forEach((lib) => {
      lib.shelves.forEach((sh) => {
        sh.items.forEach((it) => {
          result.push({
            ...it,
            libraryName: lib.name,
            shelfName: sh.name,
          });
        });
      });
    });
    return result;
  };

  const filteredSearchItems = getAllItemsWithLocation().filter(
      (i) =>
          i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.type.toLowerCase().includes(searchQuery.toLowerCase())
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
                                    <View style={styles.cardRow}>
                                      <TouchableOpacity
                                          style={styles.cardMain}
                                          onPress={() => setSelectedLibrary(item)}
                                      >
                                        <Text style={styles.cardTitle}>{item.name}</Text>
                                        <Text style={styles.cardSubtitle}>
                                          {item.shelves.length} adet raf var ➔
                                        </Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                          style={styles.deleteBtn}
                                          onPress={() => deleteLibrary(item.id)}
                                      >
                                        <Text style={styles.deleteBtnText}>🗑️</Text>
                                      </TouchableOpacity>
                                    </View>
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
                                    <View style={styles.cardRow}>
                                      <TouchableOpacity
                                          style={[styles.cardMain, { borderLeftColor: '#E67E22' }]}
                                          onPress={() => setSelectedShelf(item)}
                                      >
                                        <Text style={styles.cardTitle}>{item.name}</Text>
                                        <Text style={styles.cardSubtitle}>{item.items.length} öge var ➔</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                          style={styles.deleteBtn}
                                          onPress={() => deleteShelf(item.id)}
                                      >
                                        <Text style={styles.deleteBtnText}>🗑️</Text>
                                      </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                  <Text style={styles.emptyText}>Bu kitaplıkta raf yok.</Text>
                                }
                            />
                          </>
                      )}

                      {/* LEVEL 3: Ögeler (Sıralama ve Detay Özellikli) */}
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
                                  onPress={() => setModalType('item')}
                              >
                                <Text style={styles.addMiniButtonText}>+ Öge Ekle</Text>
                              </TouchableOpacity>
                            </View>

                            <FlatList
                                data={selectedShelf.items}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item, index }) => (
                                    <View style={styles.itemCardRow}>
                                      {/* Sıra Değiştirme Butonları */}
                                      <View style={styles.orderActions}>
                                        <TouchableOpacity
                                            disabled={index === 0}
                                            onPress={() => moveItemOrder(item.id, 'up')}
                                        >
                                          <Text style={[styles.arrowText, index === 0 && styles.disabledText]}>
                                            ▲
                                          </Text>
                                        </TouchableOpacity>
                                        <Text style={styles.orderBadge}>{item.orderNo}</Text>
                                        <TouchableOpacity
                                            disabled={index === selectedShelf.items.length - 1}
                                            onPress={() => moveItemOrder(item.id, 'down')}
                                        >
                                          <Text
                                              style={[
                                                styles.arrowText,
                                                index === selectedShelf.items.length - 1 && styles.disabledText,
                                              ]}
                                          >
                                            ▼
                                          </Text>
                                        </TouchableOpacity>
                                      </View>

                                      {/* Kart İçeriği (Tıklanınca Detay Açılır) */}
                                      <TouchableOpacity
                                          style={styles.itemCardMain}
                                          onPress={() => openDetailModal(item)}
                                      >
                                        <View style={styles.cardHeader}>
                                          <Text style={styles.cardTitle}>{item.title}</Text>
                                          <View style={styles.typeTag}>
                                            <Text style={styles.typeTagText}>{item.type}</Text>
                                          </View>
                                        </View>

                                        <View style={styles.itemMetaRow}>
                                          <Text style={styles.statusBadge}>{item.status || 'Başlanmadı'}</Text>
                                          {item.progress ? (
                                              <Text style={styles.progressText}>📍 {item.progress}</Text>
                                          ) : null}
                                        </View>

                                        {item.note ? (
                                            <Text style={styles.noteSnippet} numberOfLines={1}>
                                              💬 {item.note}
                                            </Text>
                                        ) : null}
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                          style={styles.deleteBtn}
                                          onPress={() => deleteItem(item.id)}
                                      >
                                        <Text style={styles.deleteBtnText}>🗑️</Text>
                                      </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                  <Text style={styles.emptyText}>Bu rafta henüz öge yok.</Text>
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
                          placeholder="İsim veya Tür arayın..."
                          placeholderTextColor="#888"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                      />

                      <FlatList
                          data={filteredSearchItems}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                              <TouchableOpacity
                                  style={[styles.cardMain, { marginBottom: 10, borderLeftColor: '#3498DB' }]}
                                  onPress={() => openDetailModal(item)}
                              >
                                <View style={styles.cardHeader}>
                                  <Text style={styles.cardTitle}>{item.title}</Text>
                                  <View style={styles.typeTag}>
                                    <Text style={styles.typeTagText}>{item.type}</Text>
                                  </View>
                                </View>
                                <Text style={styles.cardSubtitle}>
                                  📍 <Text style={styles.highlight}>{item.libraryName}</Text> ➔{' '}
                                  <Text style={styles.highlight}>{item.shelfName}</Text>'in{' '}
                                  <Text style={styles.highlight}>{item.orderNo}. sırası</Text>
                                </Text>
                              </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            <Text style={styles.emptyText}>
                              {searchQuery ? 'Öge bulunamadı.' : 'Arama yapmak için yazın.'}
                            </Text>
                          }
                      />
                    </View>
                )}

                {/* ⚙️ AYARLAR VE PREFAB YÖNETİMİ */}
                {activeTab === 'settings' && (
                    <View style={styles.tabContent}>
                      <Text style={styles.title}>⚙️ Tür Prefab'leri</Text>
                      <Text style={styles.sectionSubtitle}>Mevcut Öge Türleri:</Text>

                      <View style={styles.typeChipContainer}>
                        {itemTypes.map((type, idx) => (
                            <View key={idx} style={styles.typeChip}>
                              <Text style={styles.typeChipText}>{type}</Text>
                            </View>
                        ))}
                      </View>

                      <View style={styles.addTypeRow}>
                        <TextInput
                            style={styles.typeInput}
                            placeholder="Yeni Tür (Örn: Figür)"
                            value={newTypeName}
                            onChangeText={setNewTypeName}
                        />
                        <TouchableOpacity style={styles.addTypeBtn} onPress={handleAddType}>
                          <Text style={styles.addTypeBtnText}>+ Ekle</Text>
                        </TouchableOpacity>
                      </View>

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
                {modalType === 'item' && 'Yeni Öge Ekle'}
              </Text>

              <TextInput
                  style={styles.modalInput}
                  placeholder={
                    modalType === 'library'
                        ? 'Örn: Salon Kitaplığı'
                        : modalType === 'shelf'
                            ? 'Örn: 1. Raf'
                            : 'Adı (Örn: The Witcher 3)'
                  }
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
              />

              {modalType === 'item' && (
                  <>
                    <Text style={styles.label}>Tür Seçin (Prefab):</Text>
                    <View style={styles.typeSelectorRow}>
                      {itemTypes.map((type) => (
                          <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeSelectBtn,
                                selectedType === type && styles.typeSelectBtnActive,
                              ]}
                              onPress={() => setSelectedType(type)}
                          >
                            <Text
                                style={[
                                  styles.typeSelectText,
                                  selectedType === type && styles.typeSelectTextActive,
                                ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                        style={styles.modalInput}
                        placeholder="Raftaki Sırası (Opsiyonel - Boşsa Sona Ekler)"
                        keyboardType="numeric"
                        value={newOrderNo}
                        onChangeText={setNewOrderNo}
                    />
                  </>
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

        {/* ÖĞE DETAY VE NOT DÜZENLEME MODALI */}
        <Modal visible={!!detailItem} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>📝 {detailItem?.title} (Detaylar)</Text>

              <Text style={styles.label}>Durum Seçimi (Opsiyonel):</Text>
              <View style={styles.typeSelectorRow}>
                {['Başlanmadı', 'Okunuyor/Oynanıyor', 'Tamamlandı', 'İstek Listesi'].map((st) => (
                    <TouchableOpacity
                        key={st}
                        style={[styles.typeSelectBtn, editStatus === st && styles.typeSelectBtnActive]}
                        onPress={() => setEditStatus(st)}
                    >
                      <Text
                          style={[
                            styles.typeSelectText,
                            editStatus === st && styles.typeSelectTextActive,
                          ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Kalınan Yer / İlerleme (Opsiyonel):</Text>
              <TextInput
                  style={styles.modalInput}
                  placeholder="Örn: Sayfa 145 veya %60"
                  value={editProgress}
                  onChangeText={setEditProgress}
              />

              <Text style={styles.label}>Kişisel Not (Opsiyonel):</Text>
              <TextInput
                  style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Örn: Arkadaşa ödünç verdim, çok sürükleyici..."
                  multiline={true}
                  value={editNote}
                  onChangeText={setEditNote}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                    onPress={() => setDetailItem(null)}
                >
                  <Text style={styles.modalButtonText}>Kapat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#2ECC71' }]}
                    onPress={saveItemDetails}
                >
                  <Text style={styles.modalButtonText}>Kaydet</Text>
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
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
    marginBottom: 8,
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardMain: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#8E44AD',
  },
  deleteBtn: {
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  orderActions: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2980B9',
  },
  disabledText: {
    color: '#BDC3C7',
  },
  orderBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginVertical: 2,
  },
  itemCardMain: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#2ECC71',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  statusBadge: {
    fontSize: 11,
    backgroundColor: '#EAECEE',
    color: '#34495E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
    color: '#7F8C8D',
  },
  noteSnippet: {
    fontSize: 11,
    color: '#8E44AD',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  typeTag: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  typeTagText: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: 'bold',
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
  typeChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  typeChip: {
    backgroundColor: '#EAECEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  typeChipText: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '600',
  },
  addTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addTypeBtn: {
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  addTypeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
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
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginBottom: 6,
    marginTop: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F2F4F4',
    borderWidth: 1,
    borderColor: '#BDC3C7',
  },
  typeSelectBtnActive: {
    backgroundColor: '#8E44AD',
    borderColor: '#8E44AD',
  },
  typeSelectText: {
    fontSize: 11,
    color: '#34495E',
  },
  typeSelectTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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