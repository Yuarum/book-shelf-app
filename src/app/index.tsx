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
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_KEY = '@book_shelf_data_v1';
const TYPES_KEY = '@book_shelf_types_v1';

export interface Item {
  id: string;
  title: string;
  type: string;
  orderNo: string;
  status?: string;
  progress?: string;
  note?: string;
}

export interface Shelf {
  id: string;
  name: string;
  items: Item[];
}

export interface Library {
  id: string;
  name: string;
  shelves: Shelf[];
}

export interface SearchItem extends Item {
  libraryName: string;
  shelfName: string;
}

export default function Index() {
  const [isBookOpen, setIsBookOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'stats' | 'settings'>('library');

  const dragProgress = useSharedValue<number>(0);

  const [itemTypes, setItemTypes] = useState<string[]>(['Kitap', 'Oyun', 'Dergi', 'Manga']);
  const [newTypeName, setNewTypeName] = useState<string>('');

  const [libraries, setLibraries] = useState<Library[]>([]);

  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);

  const [modalType, setModalType] = useState<'library' | 'shelf' | 'item' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('Kitap');
  const [newOrderNo, setNewOrderNo] = useState<string>('');

  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Başlanmadı');
  const [editProgress, setEditProgress] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // JSON Import / Export State
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // --- 1. 3D KAPAK JESTLERİ ---
  const handleOpenBook = () => setIsBookOpen(true);
  const handleCloseBook = () => {
    setIsBookOpen(false);
    setSelectedLibrary(null);
    setSelectedShelf(null);
  };

  const onGestureEventOpen = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX < 0) {
      dragProgress.value = Math.min(Math.abs(translationX) / (SCREEN_WIDTH * 0.6), 1);
    }
  };

  const onGestureEndOpen = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX < -60) {
      dragProgress.value = withSpring(1, { damping: 15 }, (finished) => {
        if (finished) runOnJS(handleOpenBook)();
      });
    } else {
      dragProgress.value = withSpring(0);
    }
  };

  const onGestureEventClose = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX > 0) {
      dragProgress.value = Math.max(1 - translationX / (SCREEN_WIDTH * 0.6), 0);
    }
  };

  const onGestureEndClose = (event: PanGestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX;
    if (translationX > SCREEN_WIDTH * 0.3) {
      dragProgress.value = withSpring(0, { damping: 18, stiffness: 90 }, (finished) => {
        if (finished) runOnJS(handleCloseBook)();
      });
    } else {
      dragProgress.value = withSpring(1, { damping: 18, stiffness: 90 });
    }
  };

  const cover3DAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = dragProgress.value * -110;
    return {
      transform: [
        { perspective: 1200 },
        { translateX: -SCREEN_WIDTH / 2 },
        { rotateY: `${rotateY}deg` },
        { translateX: SCREEN_WIDTH / 2 },
      ],
      opacity: isBookOpen && dragProgress.value === 1 ? 0 : 1 - dragProgress.value * 0.2,
    };
  });

  // --- 2. ASYNCSTORAGE ---
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

      if (savedLibs) {
        setLibraries(JSON.parse(savedLibs) as Library[]);
      } else {
        setLibraries([
          {
            id: 'lib-1',
            name: 'Salon Kitaplığı',
            shelves: [
              {
                id: 'shelf-1',
                name: '1. Raf',
                items: [
                  { id: 'i-1', title: 'Dune', type: 'Kitap', orderNo: '1', status: 'Okunuyor/Oynanıyor', progress: 'Sayfa 120', note: 'Harika gidiyor' },
                  { id: 'i-2', title: '1984', type: 'Kitap', orderNo: '2', status: 'Tamamlandı', progress: '', note: '' },
                ],
              },
            ],
          },
        ]);
      }

      if (savedTypes) setItemTypes(JSON.parse(savedTypes) as string[]);
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

  // --- 3. İSTATİSTİK HESAPLAMALARI ---
  const getAllItems = (): SearchItem[] => {
    const result: SearchItem[] = [];
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

  const allItems = getAllItems();
  const totalLibraries = libraries.length;
  const totalShelves = libraries.reduce((acc, lib) => acc + lib.shelves.length, 0);
  const totalItemsCount = allItems.length;

  const completedItemsCount = allItems.filter(
      (i) => i.status === 'Tamamlandı' || i.status === 'Bitti'
  ).length;

  const completionPercentage =
      totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  const typeCounts = itemTypes.map((type) => ({
    type,
    count: allItems.filter((i) => i.type === type).length,
  }));

  // --- 4. SIRA DEĞİŞTİRME & CRUD ---
  const moveItemOrder = (itemId: string, direction: 'up' | 'down') => {
    if (!selectedLibrary || !selectedShelf) return;

    const currentItems = [...selectedShelf.items];
    const index = currentItems.findIndex((it) => it.id === itemId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const temp = currentItems[index];
    currentItems[index] = currentItems[targetIndex];
    currentItems[targetIndex] = temp;

    const updatedItems = currentItems.map((it, idx) => ({ ...it, orderNo: (idx + 1).toString() }));
    updateShelfItems(updatedItems);
  };

  const updateShelfItems = (newItems: Item[]) => {
    if (!selectedLibrary || !selectedShelf) return;

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

  const deleteLibrary = (libId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLibraries(libraries.filter((l) => l.id !== libId));
  };

  const deleteShelf = (shelfId: string) => {
    if (!selectedLibrary) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedShelves = selectedLibrary.shelves.filter((s) => s.id !== shelfId);
    const updatedLibs = libraries.map((lib) =>
        lib.id === selectedLibrary.id ? { ...lib, shelves: updatedShelves } : lib
    );
    setLibraries(updatedLibs);
    setSelectedLibrary({ ...selectedLibrary, shelves: updatedShelves });
  };

  const deleteItem = (itemId: string) => {
    if (!selectedShelf) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateShelfItems(selectedShelf.items.filter((i) => i.id !== itemId));
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (modalType === 'library') {
      const newLib: Library = { id: Date.now().toString(), name: newItemTitle, shelves: [] };
      setLibraries([...libraries, newLib]);
    } else if (modalType === 'shelf' && selectedLibrary) {
      const newShelf: Shelf = { id: Date.now().toString(), name: newItemTitle, items: [] };
      const updated = libraries.map((lib) =>
          lib.id === selectedLibrary.id ? { ...lib, shelves: [...lib.shelves, newShelf] } : lib
      );
      setLibraries(updated);
      setSelectedLibrary({ ...selectedLibrary, shelves: [...selectedLibrary.shelves, newShelf] });
    } else if (modalType === 'item' && selectedLibrary && selectedShelf) {
      const calculatedOrder = newOrderNo.trim() || (selectedShelf.items.length + 1).toString();
      const newItem: Item = {
        id: Date.now().toString(),
        title: newItemTitle,
        type: selectedType,
        orderNo: calculatedOrder,
        status: 'Başlanmadı',
        progress: '',
        note: '',
      };

      updateShelfItems([...selectedShelf.items, newItem]);
    }

    setNewItemTitle('');
    setNewOrderNo('');
    setModalType(null);
  };

  const openDetailModal = (item: Item) => {
    setDetailItem(item);
    setEditStatus(item.status || 'Başlanmadı');
    setEditProgress(item.progress || '');
    setEditNote(item.note || '');
  };

  const saveItemDetails = () => {
    if (!detailItem || !selectedShelf) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedItems = selectedShelf.items.map((it) =>
        it.id === detailItem.id
            ? { ...it, status: editStatus, progress: editProgress, note: editNote }
            : it
    );

    updateShelfItems(updatedItems);
    setDetailItem(null);
  };

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    if (!itemTypes.includes(newTypeName.trim())) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItemTypes([...itemTypes, newTypeName.trim()]);
      setSelectedType(newTypeName.trim());
    }
    setNewTypeName('');
  };

  // JSON YEDEK YÜKLEME
  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        setLibraries(parsed);
        setIsImportModalOpen(false);
        setJsonInput('');
        Alert.alert('Başarılı', 'Yedek veriler yüklendi!');
      } else {
        Alert.alert('Hata', 'Geçersiz veri formatı!');
      }
    } catch {
      Alert.alert('Hata', 'JSON ayrıştırılamadı!');
    }
  };

  const filteredSearchItems = allItems.filter(
      (i) =>
          i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <PanGestureHandler onGestureEvent={onGestureEventClose} onHandlerStateChange={onGestureEndClose}>
            <View style={styles.mainContent}>
              <View style={styles.pageBody}>
                {/* TAB 1: KİTAPLIKLAR */}
                {activeTab === 'library' && (
                    <View style={styles.tabContent}>
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

                {/* TAB 2: ARAMA */}
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

                {/* TAB 3: İSTATİSTİKLER (DASHBOARD) */}
                {activeTab === 'stats' && (
                    <ScrollView style={styles.tabContent}>
                      <Text style={styles.title}>📊 Koleksiyon İstatistikleri</Text>

                      {/* Özet Kartları */}
                      <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { borderTopColor: '#8E44AD' }]}>
                          <Text style={styles.statNumber}>{totalLibraries}</Text>
                          <Text style={styles.statLabel}>Kitaplık</Text>
                        </View>
                        <View style={[styles.statCard, { borderTopColor: '#E67E22' }]}>
                          <Text style={styles.statNumber}>{totalShelves}</Text>
                          <Text style={styles.statLabel}>Raf</Text>
                        </View>
                        <View style={[styles.statCard, { borderTopColor: '#2ECC71' }]}>
                          <Text style={styles.statNumber}>{totalItemsCount}</Text>
                          <Text style={styles.statLabel}>Toplam Öge</Text>
                        </View>
                      </View>

                      {/* İlerleme Barı */}
                      <View style={styles.progressContainer}>
                        <Text style={styles.sectionSubtitle}>
                          Tamamlanma Oranı: %{completionPercentage} ({completedItemsCount}/{totalItemsCount})
                        </Text>
                        <View style={styles.progressBarBackground}>
                          <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
                        </View>
                      </View>

                      {/* Tür Dağılımı */}
                      <Text style={styles.sectionSubtitle}>Tür Dağılımı:</Text>
                      {typeCounts.map((tc, idx) => (
                          <View key={idx} style={styles.typeStatRow}>
                            <Text style={styles.typeStatName}>{tc.type}</Text>
                            <Text style={styles.typeStatCount}>{tc.count} adet</Text>
                          </View>
                      ))}
                    </ScrollView>
                )}

                {/* TAB 4: AYARLAR VE YEDEKLEME */}
                {activeTab === 'settings' && (
                    <ScrollView style={styles.tabContent}>
                      <Text style={styles.title}>⚙️ Ayarlar & Prefab'ler</Text>
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

                      <Text style={[styles.sectionSubtitle, { marginTop: 20 }]}>💾 Veri Yedekleme (JSON):</Text>
                      <TouchableOpacity
                          style={styles.backupBtn}
                          onPress={() => setIsImportModalOpen(true)}
                      >
                        <Text style={styles.backupBtnText}>📥 JSON Yedek Yükle / Aktar</Text>
                      </TouchableOpacity>
                    </ScrollView>
                )}
              </View>

              {/* SAĞ DİKEY AYRAÇLAR (4 TAB) */}
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
                      { backgroundColor: '#F39C12' },
                      activeTab === 'stats' && styles.activeBookmark,
                    ]}
                    onPress={() => setActiveTab('stats')}
                >
                  <Text style={styles.bookmarkText}>Rapor</Text>
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
          </PanGestureHandler>

          {/* 3D KAPAK */}
          {(!isBookOpen || dragProgress.value < 1) && (
              <PanGestureHandler onGestureEvent={onGestureEventOpen} onHandlerStateChange={onGestureEndOpen}>
                <Animated.View style={[styles.coverOverlay, cover3DAnimatedStyle]}>
                  <Text style={styles.coverTitle}>KİŞİSEL KİTAPLIĞIM</Text>
                  <Text style={styles.coverInstruction}>◄ Kapağı sola çevir / Sağa kaydırıp kapat ►</Text>
                </Animated.View>
              </PanGestureHandler>
          )}

          {/* MODAL: EKLEME */}
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
                          placeholder="Raftaki Sırası (Opsiyonel)"
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

          {/* MODAL: DETAY */}
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
                    placeholder="Örn: Arkadaşa ödünç verdim..."
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

          {/* MODAL: JSON IMPORT / YEDEK YÜKLEME */}
          <Modal visible={isImportModalOpen} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>📥 JSON Veri Yükleme</Text>
                <Text style={styles.label}>Yedek JSON Metnini Buraya Yapıştırın:</Text>
                <TextInput
                    style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                    placeholder='[{"id":"1", "name":"Kitaplık", ...}]'
                    multiline={true}
                    value={jsonInput}
                    onChangeText={setJsonInput}
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#95A5A6' }]}
                      onPress={() => setIsImportModalOpen(false)}
                  >
                    <Text style={styles.modalButtonText}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#2980B9' }]}
                      onPress={handleImportJSON}
                  >
                    <Text style={styles.modalButtonText}>Yükle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EBE0',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
    borderRightWidth: 4,
    borderRightColor: '#F1C40F',
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
  backupBtn: {
    backgroundColor: '#2980B9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backupBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  statCard: {
    flex: 0.31,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderTopWidth: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 4,
  },
  progressContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#ECF0F1',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
  },
  typeStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeStatName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34495E',
  },
  typeStatCount: {
    fontSize: 14,
    color: '#8E44AD',
    fontWeight: '600',
  },
  bookmarkContainer: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  bookmark: {
    width: 45,
    paddingVertical: 16,
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