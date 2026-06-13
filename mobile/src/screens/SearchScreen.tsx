import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, radius } from '../theme';
import { SearchBar, CreatorCard, CategoryPill } from '../components';
import { creatorsAPI } from '../services/api';

const cities = ['All Cities', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Jaipur', 'Kolkata'];

export default function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');

  const searchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (query) params.search = query;
      if (selectedCity !== 'All Cities') params.city = selectedCity;
      const res = await creatorsAPI.getAll(params);
      setCreators(res.data?.creators || res.data?.data || []);
    } catch (e) {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCity]);

  useEffect(() => {
    const timeout = setTimeout(searchCreators, 400);
    return () => clearTimeout(timeout);
  }, [query, selectedCity]);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No creators found</Text>
      <Text style={styles.emptySubtitle}>Try a different search or filter</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, city, specialty..."
        />
      </View>

      {/* City filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={cities}
        contentContainerStyle={styles.cityList}
        renderItem={({ item }) => (
          <CategoryPill
            label={item}
            active={selectedCity === item}
            onPress={() => setSelectedCity(item)}
          />
        )}
        keyExtractor={(item) => item}
      />

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={creators}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultList}
          renderItem={({ item }) => (
            <CreatorCard
              creator={item}
              onPress={(id) => navigation.navigate('CreatorProfile', { id })}
            />
          )}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.md,
  },
  cityList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
});
