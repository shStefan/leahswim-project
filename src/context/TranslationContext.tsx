import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types for our translation system
export type Language = 'ru' | 'en';

export interface TranslationCache {
  [key: string]: {
    [lang in Language]?: string;
  };
}

export interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string, targetLang?: Language) => Promise<string>;
  isTranslating: boolean;
  availableLanguages: Language[];
  isReady: boolean; // New: indicates when English context is fully loaded
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation service for dynamic content
class TranslationService {
  private cache: TranslationCache = {};
  private readonly CACHE_KEY = 'triangl_translations';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Static mapping for common Russian to English translations
  private static readonly STATIC_MAPPINGS: Record<string, string> = {
    // ──────────────────────────────────────────────
    // UI ELEMENTS
    // ──────────────────────────────────────────────
    'ЦВЕТ': 'COLOR',
    'Категория': 'Category',
    'Сортировать': 'Sort',
    'Очистить все': 'Clear All',
    'Размер': 'Size',
    'Цвет': 'Color',
    'COLOR': 'COLOR',
    'Category': 'Category',
    'Sort': 'Sort',
    'Clear All': 'Clear All',
    'Size': 'Size',
    'Color': 'Color',

    // ──────────────────────────────────────────────
    // ONE-PIECE SWIMSUITS (Слитный купальник)
    // ──────────────────────────────────────────────
    // Base names
    'Слитный купальник классика': 'One-piece classic swimsuit',
    'Слитный купальник классика двусторонний': 'One-piece reversible classic swimsuit',
    'Купальник слитный классика двусторонний': 'One-piece reversible classic swimsuit',
    'Слитный купальник в ретро стиле': 'One-piece retro swimsuit',
    'Купальник слитный в ретро стиле': 'One-piece retro swimsuit',
    'Слитный купальник на одно плечо': 'One-shoulder swimsuit',
    'Купальник на одно плечо': 'One-shoulder swimsuit',
    'Слитный купальник Victoria Ibiza': 'One-piece Victoria swimsuit',
    'Слитный купальник "Виктория" Ибица': 'One-piece Victoria swimsuit',
    'Слитный купальник Eva': 'One-piece Eva swimsuit',
    'Слитный купальник Jodie': 'One-piece Jodie swimsuit',
    'Слитный купальник Джоди': 'One-piece Jodie swimsuit',
    'Слитный купальник Shell': 'One-piece Shell swimsuit',
    'Слитный купальник на косточках Paloma': 'One-piece Paloma swimsuit',
    'Слитный купальник на косточках "Палома"': 'One-piece Paloma swimsuit',
    'Слитный купальник Miranda двусторонний': 'One-piece Miranda swimsuit',
    'Слитный купальник Mariella двусторонний': 'One-piece Marielle swimsuit',
    'Слитный купальник с чашками Plus Size': 'One-piece swimsuit Plus Size',
    // Color variants
    'Слитный купальник классика Сицилия / Раннее утро': 'One-piece classic swimsuit Sicily / Early Morning',
    'Слитный купальник классика Редкоут / Канаты LEAH': 'One-piece classic swimsuit Redcoat / LEAH Ropes',
    'Слитный купальник классика Ледяное сияние': 'One-piece classic swimsuit Icy Glow',
    'Слитный купальник классика Изумруд': 'One-piece classic swimsuit Emerald',
    'Слитный купальник классика Ирландия / Жизнь океана': 'One-piece classic swimsuit Ireland / Ocean Life',
    'Слитный купальник классика Страна грёз / Морская звезда': 'One-piece classic swimsuit Dreamland / Starfish',
    'Слитный купальник классика Сицилия / Лава': 'One-piece classic swimsuit Sicily / Lava',
    'Слитный купальник классика Коралл / Ледяное сияние': 'One-piece classic swimsuit Coral / Icy Glow',
    'Слитный купальник классика Пальмы / Оранжина': 'One-piece classic swimsuit Palms / Orangina',
    'Слитный купальник классика Лотос / Фрагола': 'One-piece classic swimsuit Lotus / Fragola',
    'Слитный классика Оранжина / Ирландия': 'One-piece classic swimsuit Orangina / Ireland',
    'Слитный купальник Ева Коралл / Ледяное сияние': 'One-piece Eva swimsuit Coral / Icy Glow',
    'Слитный купальник  Ева Пальмы / Оранжина': 'One-piece Eva swimsuit Palms / Orangina',
    'Слитный купальник "Ракушки" Ирландия / Жизнь океана': 'One-piece "Shells" swimsuit Ireland / Ocean Life',
    'Слитный купальник "Ракушки" Страна грёз / Морская звезда': 'One-piece "Shells" swimsuit Dreamland / Starfish',

    // ──────────────────────────────────────────────
    // SPORTS SWIMSUITS (Спортивный купальник)
    // ──────────────────────────────────────────────
    'Спортивный купальник с коротким рукавом': 'Short sleeve sports swimsuit',
    'Спортивный купальник с длинным рукавом': 'Long sleeve sports swimsuit',
    // Color variants
    'Спортивный купальник с длинным рукавом Изумруд': 'Long sleeve sports swimsuit Emerald',
    'Спортивный купальник с коротким рукавом Ледяное сияние': 'Short sleeve sports swimsuit Icy Glow',
    'Спортивный купальник с длинным рукавом Мирра': 'Long sleeve sports swimsuit Myrrh',
    'Спортивный купальник с длинным рукавом Лотос': 'Long sleeve sports swimsuit Lotus',
    'Спортивный купальник с длинным рукавом Коралл': 'Long sleeve sports swimsuit Coral',
    'Спортивный купальник с коротким рукавом Мирра': 'Short sleeve sports swimsuit Myrrh',
    'Спортивный купальник с коротким рукавом Лотос': 'Short sleeve sports swimsuit Lotus',

    // ──────────────────────────────────────────────
    // BRAS (Бра)
    // ──────────────────────────────────────────────
    // Base names
    'Бра бикини': 'Bikini bra',
    'Бра Бикини': 'Bikini bra',
    'Бра бикини двустороннее': 'Bikini bra',
    'Бра бикини двустороннee': 'Bikini bra',
    'Бра классика': 'Classic bra',
    'Бра Классика': 'Classic bra',
    'Бра классика двустороннее': 'Classic bra',
    'Бра Бандо': 'Bandeau bra',
    'Бра бандо': 'Bandeau bra',
    'Бра Бандо двустороннее': 'Bandeau bra',
    'Бра бандо двустороннее': 'Bandeau bra',
    'Бра Ким': 'Kim Bra',
    'Бра "Ким"': 'Kim Bra',
    'Бра Ким двустороннее Plus Size': 'Kim Bra',
    'Бра двустороннее Ким': 'Kim Bra',
    'Бра Ким Plus Size': 'Kim Bra Plus Size',
    'Бра майка': 'Tank top bra',
    'Бра в ретро стиле': 'Retro style bra',
    'Бра в ретро стиле двустороннее': 'Retro style bra',
    'Бра в ретро стиле двустороннее Ибица': 'Retro style bra Ibiza',
    'Бра Бандо двустороннее Ибица': 'Bandeau bra Ibiza',
    'Бра бандо с завязками': 'Bandeau bra',
    'Бра на завязках': 'Tie-up bra',
    'Бра Бандо Plus Size': 'Bandeau bra Plus Size',
    // Bra color variants — Bikini
    'Бра бикини Редкоут / Новый океан': 'Bikini bra Redcoat / New Ocean',
    'Бра бикини Оранжина / Ирландия': 'Bikini bra Orangina / Ireland',
    'Бра бикини Изумрудное сияние': 'Bikini bra Emerald Glow',
    'Бра бикини Бархатный горький апельсин': 'Bikini bra Velvet Bitter Orange',
    'Бра бикини Ирландия / Жизнь океана': 'Bikini bra Ireland / Ocean Life',
    'Бра бикини Редкоут / Канаты LEAH': 'Bikini bra Redcoat / LEAH Ropes',
    'Бра бикини Сицилия / Лава': 'Bikini bra Sicily / Lava',
    'Бра бикини Страна грёз / Морская звезда': 'Bikini bra Dreamland / Starfish',
    'Бра бикини Коралл / Ледяное сияние': 'Bikini bra Coral / Icy Glow',
    'Бра бикини Мирра / Сицилия': 'Bikini bra Myrrh / Sicily',
    'Бра бикини двустороннee Ибица': 'Bikini bra Ibiza',
    'Плавки бикини двусторонние Ибица': 'Bikini bottoms Ibiza',
    // Bra color variants — "Ракушки" (Shells)
    'Бра бикини "Ракушки" Ирландия / Жизнь океана': 'Bikini bra "Shells" Ireland / Ocean Life',
    'Бра бикини "Ракушки" Редкоут / Канаты LEAH': 'Bikini bra "Shells" Redcoat / LEAH Ropes',
    'Бра бикини "Ракушки" Страна грёз / Морская звезда': 'Bikini bra "Shells" Dreamland / Starfish',
    'Бра бикини "Ракушки" Сицилия / Лава': 'Bikini bra "Shells" Sicily / Lava',
    // Bra color variants — Classic
    'Бра классика Изумрудное синие': 'Classic bra Emerald Blue',
    'Бра классика Ледяное сияние': 'Classic bra Icy Glow',
    'Бра классика Страна грёз / Ледяное сияние': 'Classic bra Dreamland / Icy Glow',
    'Бра классика Сицилия / Раннее утро': 'Classic bra Sicily / Early Morning',
    'Бра классика Коралл / Ледяное сияние': 'Classic bra Coral / Icy Glow',
    'Бра классика Мирра / Сицилия': 'Classic bra Myrrh / Sicily',
    'Бра классика Пальмы / Оранжина': 'Classic bra Palms / Orangina',
    'Бра классика Лотос / Фрагола': 'Classic bra Lotus / Fragola',
    // Bra color variants — Bandeau
    'Бра бандо Сицилия / Раннее утро': 'Bandeau bra Sicily / Early Morning',
    'Бра бандо Оранжина / Ирландия': 'Bandeau bra Orangina / Ireland',
    'Бра бандо Редкоут / Новый океан': 'Bandeau bra Redcoat / New Ocean',
    'Бра бандо Коралл / Ледяное сияние': 'Bandeau bra Coral / Icy Glow',
    'Бра бандо Лотос / Фрагола': 'Bandeau bra Lotus / Fragola',
    // Bra color variants — Tank top
    'Бра майка Редкоут / Канаты LEAH': 'Tank top bra Redcoat / LEAH Ropes',
    'Бра майка Сицилия / Раннее утро': 'Tank top bra Sicily / Early Morning',
    'Бра майка Ирландия / Жизнь океана': 'Tank top bra Ireland / Ocean Life',
    'Бра майка Страна грёз / Морская звезда': 'Tank top bra Dreamland / Starfish',
    'Бра майка Бархатная фуксия': 'Tank top bra Velvet Fuchsia',
    'Бра майка Бархатный горький апельсин': 'Tank top bra Velvet Bitter Orange',
    'Бра майка Редкоут / Новый океан': 'Tank top bra Redcoat / New Ocean',
    'Бра майка Оранжина / Ирландия': 'Tank top bra Orangina / Ireland',
    'Бра майка Страна грёз / Ледяное сияние': 'Tank top bra Dreamland / Icy Glow',
    'Бра майка Коралл / Ледяное сияние': 'Tank top bra Coral / Icy Glow',
    'Бра майка Мирра / Сицилия': 'Tank top bra Myrrh / Sicily',
    'Бра майка Пальмы / Оранжина': 'Tank top bra Palms / Orangina',
    'Бра майка Лотос / Фрагола': 'Tank top bra Lotus / Fragola',

    // ──────────────────────────────────────────────
    // BOTTOMS (Плавки)
    // ──────────────────────────────────────────────
    // Base names
    'Плавки бикини': 'Bikini bottoms',
    'Плавки Бикини': 'Bikini bottoms',
    'Плавки бикини двусторонние': 'Bikini bottoms',
    'Плавки бикини двустороннee': 'Bikini bottoms',
    'Плавки классика': 'Classic bottoms',
    'Плавки Классика': 'Classic bottoms',
    'Плавки Классика двусторонние': 'Classic bottoms',
    'Плавки классика двусторонние': 'Classic bottoms',
    'Плавки Классика двусторонние Ибица': 'Classic bottoms Ibiza',
    'Плавки с высокой талией': 'High waist bottoms',
    'Плавки с высокой талией двусторонние': 'High waist bottoms',
    'Плавки с высокой талией двусторонние Ибица': 'High waist bottoms Ibiza',
    'Плавки с завышенной талией': 'High waist bottoms',
    'Плавки с завышенной талией двусторонние': 'High waist bottoms',
    'Плавки с завышенной талией Plus Size': 'High waist bottoms Plus Size',
    'Плавки с заниженной талией': 'Low-rise bottoms',
    'Плавки в ретро стиле': 'Retro style bottoms',
    'Плавки в ретро стиле двусторонние': 'Retro style bottoms',
    'Плавки Martina двусторонние Plus Size': 'Martina bottoms',
    'Плавки на завязках': 'Tie-up bottoms',
    'Плавки под грудь Plus Size': 'Under-bust bottoms Plus Size',
    'Плавки классика Plus Size': 'Classic bottoms Plus Size',
    'Мужские плавки': 'Men trunks',
    'Мужские плавки Мирра': 'Men trunks Myrrh',
    // Bottoms color variants — Bikini
    'Плавки бикини Редкоут / Новый океан': 'Bikini bottoms Redcoat / New Ocean',
    'Плавки бикини Оранжина / Ирландия': 'Bikini bottoms Orangina / Ireland',
    'Плавки бикини Страна грёз / Морская звезда': 'Bikini bottoms Dreamland / Starfish',
    'Плавки бикини Бархатный горький апельсин': 'Bikini bottoms Velvet Bitter Orange',
    'Плавки бикини Бархатные сплетни': 'Bikini bottoms Velvet Gossip',
    'Плавки бикини Бархатная фуксия': 'Bikini bottoms Velvet Fuchsia',
    'Плавки бикини Изумруд': 'Bikini bottoms Emerald',
    'Плавки бикини Ледяное сияние': 'Bikini bottoms Icy Glow',
    'Плавки бикини Редкоут / Канаты LEAH': 'Bikini bottoms Redcoat / LEAH Ropes',
    'Плавки бикини Сицилия / Лава': 'Bikini bottoms Sicily / Lava',
    'Плавки бикини Ирландия / Жизнь океана': 'Bikini bottoms Ireland / Ocean Life',
    'Плавки бикини Коралл / Ледяное сияние': 'Bikini bottoms Coral / Icy Glow',
    'Плавки бикини Пальмы / Оранжина': 'Bikini bottoms Palms / Orangina',
    // Bikini "Ракушки" (Shells)
    'Плавки бикини "Ракушки" Редкоут / Канаты LEAH': 'Bikini bottoms "Shells" Redcoat / LEAH Ropes',
    'Плавки бикини "Ракушки" Сицилия / Лава': 'Bikini bottoms "Shells" Sicily / Lava',
    'Плавки бикини "Ракушки" Ирландия / Жизнь океана': 'Bikini bottoms "Shells" Ireland / Ocean Life',
    'Плавки бикини "Ракушки" Страна грёз / Морская звезда': 'Bikini bottoms "Shells" Dreamland / Starfish',
    // Bottoms color variants — Classic
    'Плавки классика Редкоут / Канаты LEAH': 'Classic bottoms Redcoat / LEAH Ropes',
    'Плавки классика Страна грёз / Морская звезда': 'Classic bottoms Dreamland / Starfish',
    'Плавки классика Сицилия / Лава': 'Classic bottoms Sicily / Lava',
    'Плавки классика Ирландия / Жизнь океана': 'Classic bottoms Ireland / Ocean Life',
    'Плавки классика Бархатные сплетни': 'Classic bottoms Velvet Gossip',
    'Плавки классика Бархатный горький апельсин': 'Classic bottoms Velvet Bitter Orange',
    'Плавки классика Бархатный кутюр': 'Classic bottoms Velvet Couture',
    'Плавки классика Редкоут / Новый океан': 'Classic bottoms Redcoat / New Ocean',
    'Плавки классика Ледяное сияние': 'Classic bottoms Icy Glow',
    'Плавки классика Сицилия / Раннее утро': 'Classic bottoms Sicily / Early Morning',
    'Плавки классика Оранжина / Ирландия': 'Classic bottoms Orangina / Ireland',
    'Плавки классика Страна грёз / Ледяное сияние': 'Classic bottoms Dreamland / Icy Glow',
    'Плавки классика Коралл / Ледяное сияние': 'Classic bottoms Coral / Icy Glow',
    'Плавки классика Пальмы / Оранжина': 'Classic bottoms Palms / Orangina',
    'Плавки классика Лотос / Фрагола': 'Classic bottoms Lotus / Fragola',
    // Bottoms color variants — High waist
    'Плавки с завышенной талией Оранжина / Ирландия': 'High waist bottoms Orangina / Ireland',
    'Плавки с завышенной талией Редкоут / Новый океан': 'High waist bottoms Redcoat / New Ocean',
    'Плавки с завышенной талией Страна грёз / Ледяное сияние': 'High waist bottoms Dreamland / Icy Glow',
    'Плавки с завышенной талией Сицилия / Раннее утро': 'High waist bottoms Sicily / Early Morning',
    'Плавки с завышенной талией Мирра / Сицилия': 'High waist bottoms Myrrh / Sicily',
    'Плавки с завышенной талией Пальмы / Оранжина': 'High waist bottoms Palms / Orangina',
    'Плавки с завышенной талией Лотос / Фрагола': 'High waist bottoms Lotus / Fragola',
    // Bottoms color variants — Low-rise
    'Плавки с заниженной талией Сицилия / Раннее утро': 'Low-rise bottoms Sicily / Early Morning',
    'Плавки с заниженной талией Редкоут / Новый океан': 'Low-rise bottoms Redcoat / New Ocean',
    'Плавки с заниженной талией Страна грёз / Ледяное сияние': 'Low-rise bottoms Dreamland / Icy Glow',
    'Плавки с заниженной талией Коралл / Ледяное сияние': 'Low-rise bottoms Coral / Icy Glow',
    'Плавки с заниженной талией Пальмы / Оранжина': 'Low-rise bottoms Palms / Orangina',
    'Плавки с заниженной талией Мирра / Сицилия': 'Low-rise bottoms Myrrh / Sicily',
    'Плавки с заниженной талией Лотос / Фрагола': 'Low-rise bottoms Lotus / Fragola',

    // ──────────────────────────────────────────────
    // SHIRTS (Рубашка)
    // ──────────────────────────────────────────────
    'Рубашка двусторонняя': 'Reversible shirt',
    'Рубашка Slimfit': 'Slimfit shirt',
    'Рубашка приталенная': 'Slimfit shirt',
    'Рубашка из хлопка': 'Cotton shirt',
    'Рубашка из шерсти': 'Wool shirt',
    'Рубашка из вискозы с длинным рукавом': 'Long sleeve shirt',
    'Рубашка с длинным рукавом': 'Viscose long sleeve shirt',
    'Рубашка с коротким рукавом': 'Short sleeve shirt',
    'Рубашка с длинным рукавом Муслин': 'Muslin long sleeve shirt',
    'Рубашка с длинным рукавом из хлопка': 'Cotton long sleeve shirt',
    'Рубашка с коротким рукавом из хлопка': 'Cotton short sleeve shirt',
    'Рубашка из хлопка с коротким рукавом': 'Cotton short sleeve shirt',
    'Рубашка из хлопка с длинным рукавом': 'Cotton long sleeve shirt',
    'Рубашка льняная с длинным рукавом': 'Linen long sleeve shirt',
    // Color variants
    'Рубашка двусторонняя Коралл / Королевский синий': 'Reversible shirt Coral / Royal Blue',
    'Рубашка двусторонняя Мирра / Сицилия': 'Reversible shirt Myrrh / Sicily',
    'Рубашка двусторонняя Пальмы / Оранжина': 'Reversible shirt Palms / Orangina',
    'Рубашка двусторонняя Лотос / Фрагола': 'Reversible shirt Lotus / Fragola',
    'Рубашка с длинным рукавом Сирень': 'Long sleeve shirt Lilac',
    'Рубашка с коротким рукавом Коралл': 'Short sleeve shirt Coral',
    'Рубашка с коротким рукавом Мирра': 'Short sleeve shirt Myrrh',
    'Рубашка с коротким рукавом Пальмы': 'Short sleeve shirt Palms',
    'Рубашка с коротким рукавом Лотос': 'Short sleeve shirt Lotus',

    // ──────────────────────────────────────────────
    // TROUSERS (Брюки)
    // ──────────────────────────────────────────────
    'Брюки из шерсти': 'Wool trousers',
    'Брюки из хлопка': 'Cotton trousers',
    'Брюки льняные': 'Linen trousers',
    'Брюки спортивные': 'Sport trousers',
    'Брюки бананы': 'Banana trousers',
    'Брюки Бананы изо льна': 'Linen banana trousers',
    'Брюки Monaco': 'Monaco trousers',
    'Брюки "Монако"': 'Monaco trousers',
    'Брюки Муслин': 'Muslin trousers',
    'Брюки RocknRoll': 'Rock and Roll trousers',
    'Брюки Рок-н-ролл': 'Rock and Roll trousers',
    'Брюки Flower power': 'Flower Power trousers',
    'Брюки Цветочная сила': 'Flower Power trousers',
    'Брюки': 'Trousers',
    'Брюки Сирень': 'Trousers Lilac',

    // ──────────────────────────────────────────────
    // SHORTS (Шорты)
    // ──────────────────────────────────────────────
    'Шорты двусторонние': 'Reversible shorts',
    'Шорты мини': 'Mini shorts',
    'Шорты мини из хлопка': 'Cotton mini shorts',
    'Шорты мини льняные': 'Linen mini shorts',
    'Шорты мини Corfu': 'Corfu shorts',
    'Шорты мини "Корфу" изо льна': 'Linen Corfu mini shorts',
    'Шорты мини "Корфу" Коралл': 'Corfu mini shorts Coral',
    'Шорты мини "Корфу" Мирра': 'Corfu mini shorts Myrrh',
    'Шорты мини "Корфу" Пальмы': 'Corfu mini shorts Palms',
    'Шорты мини "Корфу" Лотос': 'Corfu mini shorts Lotus',
    'Шорты Corfu': 'Corfu shorts',
    'Шорты Корфу из льна': 'Linen Corfu shorts',
    'Шорты Корфу из хлопка': 'Cotton Corfu shorts',
    'Шорты миди': 'Midi shorts',
    'Шорты миди льняные': 'Linen midi shorts',
    'Шорты миди из хлопка': 'Cotton midi shorts',
    'Шорты-юбка': 'Skort',
    'Шорты': 'Shorts',
    // Color variants
    'Шорты двусторонние Коралл / Королевский синий': 'Reversible shorts Coral / Royal Blue',
    'Шорты двусторонние Мирра / Сицилия': 'Reversible shorts Myrrh / Sicily',
    'Шорты двусторонние Лотос / Фрагола': 'Reversible shorts Lotus / Fragola',
    'Шорты миди Мирра': 'Midi shorts Myrrh',
    'Шорты миди Пальмы': 'Midi shorts Palms',
    'Шорты миди Лотос': 'Midi shorts Lotus',

    // ──────────────────────────────────────────────
    // DRESSES (Платье)
    // ──────────────────────────────────────────────
    'Платье трансформер': 'Transformer dress',
    'Платье рубашка': 'Relaxed shirt dress',
    'Платье-рубашка': 'Relaxed shirt dress',
    'Платье мини Tamara': 'Tamara mini dress',
    'Платье мини "Тамара"': 'Tamara mini dress',
    'Платье миди Tamara': 'Tamara midi dress',
    'Платье миди "Тамара"': 'Tamara midi dress',
    'Платье из хлопка Butterfly': 'Cotton butterfly dress',
    'Платье из хлопка "Бабочка"': 'Cotton butterfly dress',
    'Платье "Бабочка"': 'Butterfly dress',
    'Платье Лима изо льна': 'Linen Lima dress',
    'Платье "Сицилия" из льна': 'Linen Sicily dress',
    // Color variants
    'Платье миди "Тамара" Мирра': 'Tamara midi dress Myrrh',
    'Платье миди "Тамара" Пальмы': 'Tamara midi dress Palms',
    'Платье миди "Тамара" Лотос': 'Tamara midi dress Lotus',
    'Платье мини "Тамара" Коралл': 'Tamara mini dress Coral',
    'Платье мини "Тамара" Мирра': 'Tamara mini dress Myrrh',
    'Платье мини "Тамара" Пальмы': 'Tamara mini dress Palms',
    'Платье мини "Тамара" Лотос': 'Tamara mini dress Lotus',

    // ──────────────────────────────────────────────
    // TUNICS (Туника)
    // ──────────────────────────────────────────────
    'Туника трансформер': 'Transformer tunic',
    'Туника двусторонняя': 'Reversible tunic',
    'Туника двусторонняя Мирра / Сицилия': 'Reversible tunic Myrrh / Sicily',
    'Туника Mykonos': 'Mykonos tunic',
    'Туника "Миконос"': 'Mykonos tunic',
    'Туника "Миконос" из льна': 'Linen Mykonos tunic',
    'Туника Aurelia': 'Aurelia tunic',
    'Туника с капюшоном "Странник" изо льна': 'Linen hooded "Wanderer" tunic',
    'Туника Сен-Тропе из хлопка': 'Cotton Saint-Tropez tunic',

    // ──────────────────────────────────────────────
    // OUTERWEAR & TOPS
    // ──────────────────────────────────────────────
    'Кимоно': 'Kimono',
    'Абайя из натурального шелка': 'Silk abaya',
    'Блуза изо льна': 'Linen blouse',
    'Худи': 'Hoodie',
    'Худи RocknRoll': 'Rock and Roll hoodie',
    'Худи Рок-н-ролл': 'Rock and Roll hoodie',
    'Топ спортивный': 'Sports top',
    'Топ спортивный с принтом': 'Printed sports top',
    'Топ хлопковый': 'Cotton top',
    'Топ Santorini': 'Santorini top',
    'Топ "Санторини" Коралл': 'Santorini top Coral',
    'Топ "Санторини" Мирра': 'Santorini top Myrrh',
    'Топ "Санторини" Пальмы': 'Santorini top Palms',
    'Топ "Санторини" Лотос': 'Santorini top Lotus',
    'Леггинсы': 'Leggings',
    'Велосипедки': 'Biker shorts',
    'Парео': 'Pareo',

    // ──────────────────────────────────────────────
    // ACCESSORIES — BAGS
    // ──────────────────────────────────────────────
    'Рюкзак': 'Backpack',
    'Корзина из ротанга': 'Rattan basket bag',
    'Сумка-мешок': 'Bucket bag',
    'Сумка-тоут': 'Tote bag',
    'Сумка тоут': 'Tote bag',
    'Тоут': 'Tote bag',
    'тоут': 'Tote bag',

    // ──────────────────────────────────────────────
    // ACCESSORIES — HATS
    // ──────────────────────────────────────────────
    'Шляпа Fedora': 'Fedora hat',
    'Шляпа Федора': 'Fedora hat',
    'Шляпа Daffodil': 'Daffodil hat',
    'Шляпа Нарцисс': 'Daffodil hat',
    'Шляпа Bobby': 'Bobby hat',
    'Шляпа Бобби': 'Bobby hat',
    'Шляпа Jockey': 'Jockey hat',
    'Шляпа Жокей': 'Jockey hat',
    'Шляпа Cowgirl': 'Cowgirl hat',
    'Шляпа Ковбойша': 'Cowgirl hat',
    'Шляпа Phoenix': 'Phoenix hat',
    'Шляпа Феникс': 'Phoenix hat',
    'Шляпа Cassiopea': 'Cassiopea hat',
    'Шляпа Кассиопея': 'Cassiopea hat',
    'Шляпа Anemone': 'Anemone hat',
    'Шляпа Анемона': 'Anemone hat',
    'Шляпа Dahlia': 'Dahlia hat',
    'Шляпа Георгина': 'Dahlia hat',
    'Шляпа Rose': 'Rose hat',
    'Шляпа Роза': 'Rose hat',
    'Шляпа Whisper': 'Whisper hat',
    'Шляпа Шепот': 'Whisper hat',
    'Козырек Funky': 'Funky visor',
    'Козырек Фанки': 'Funky visor',

    // ──────────────────────────────────────────────
    // ACCESSORIES — BELTS & OTHER
    // ──────────────────────────────────────────────
    'Портупея Rihanna': 'Rihanna harness belt',
    'Портупея Рианна': 'Rihanna harness belt',
    'Портупея Beyonce': 'Beyonce harness belt',
    'Портупея Бейонсе': 'Beyonce harness belt',
    'Пояс Kylie': 'Kylie belt',
    'Пояс Кайли': 'Kylie belt',
    'Твилли (двустороннее)': 'Reversible twilly',
    'Платок': 'Scarf',

    // ──────────────────────────────────────────────
    // SS26 COLLECTION — NEW PRODUCT NAMES
    // ──────────────────────────────────────────────
    // Tunics
    'Туника Олимпия': 'Olympia Tunic',
    'Туника \"Олимпия\" из хлопка': 'Olympia Tunic',
    'Туника Олимпия из хлопка': 'Olympia Tunic',
    'Туника трансформер изо льна': 'Transformer Tunic',
    'Туника трансформер из льна': 'Transformer Tunic',
    'Туника \"Миконос\" изо льна': 'Mykonos Tunic',
    'Туника \"Миконос\" из льна': 'Mykonos Tunic',
    'Туника Миконос из льна': 'Mykonos Tunic',
    'Туника Миконос': 'Mykonos Tunic',
    'Туника двусторонняя из полиэстера': 'Reversible Tunic',

    // Shirts
    'Рубашка двусторонняя из полиэстера': 'Reversible Shirt',
    'Рубашка двусторонняя Armani Silk': 'Reversible Shirt',

    // Shorts
    'Шорты двусторонние из полиэстера': 'Reversible Shorts',
    'Шорты Корфу': 'Corfu Shorts',
    'Шорты \"Корфу\" из хлопка': 'Corfu Shorts',
    'Шорты Корфу из хлопка': 'Corfu Shorts',
    'Шорты Деметра': 'Demetra Shorts',
    'Шорты \"Деметра\"': 'Demetra Shorts',
    'Шорты Деметра из вискозы': 'Demetra Shorts',

    // Dresses
    'Платье Афродита': 'Aphrodite Dress',
    'Платье \"Афродита\" изо льна': 'Aphrodite Dress',
    'Платье \"Афродита\" из льна': 'Aphrodite Dress',
    'Платье Афродита изо льна': 'Aphrodite Dress',
    'Платье Афродита из льна': 'Aphrodite Dress',
    'Платье Хитон': 'Chiton Dress',
    'Платье \"Хитон\" изо льна': 'Chiton Dress',
    'Платье \"Хитон\" из льна': 'Chiton Dress',
    'Платье Хитон изо льна': 'Chiton Dress',
    'Платье Хитон из льна': 'Chiton Dress',
    'Платье трансформер из вискозы': 'Transformer Dress',
    'Платье Ники': 'Niki Dress',
    'Платье \"Ники\"': 'Niki Dress',
    'Платье Ники из вискозы': 'Niki Dress',
    'Платье Деметра': 'Demetra Dress',
    'Платье \"Деметра\"': 'Demetra Dress',
    'Платье Деметра из вискозы': 'Demetra Dress',
    'Платье Афина': 'Athena Dress',
    'Платье \"Афина\"': 'Athena Dress',
    'Платье Афина из полиэстера': 'Athena Dress',
    'Платье рубашка из вискозы': 'Shirt Dress',
    'Платье-рубашка из вискозы': 'Shirt Dress',

    // Trousers
    'Брюки Афина': 'Athena Trousers',
    'Брюки \"Афина\"': 'Athena Trousers',
    'Брюки Афина из полиэстера': 'Athena Trousers',
    'Шаровары': 'Harem Pants',
    'Шаровары из полиэстера': 'Harem Pants',

    // ──────────────────────────────────────────────
    // COLORS / PRINT SWATCH NAMES (pa_print terms)
    // ──────────────────────────────────────────────
    // Russian color terms
    'Бежевый': 'Beige',
    'Бежевый / Коричневый': 'Beige / Brown',
    'Белый': 'White',
    'Бирюза': 'Turquoise',
    'Голубой': 'Light Blue',
    'Жёлтый': 'Yellow',
    'Зеленый': 'Green',
    'Коралл': 'Coral',
    'Коралл черный': 'Coral Black',
    'Коричневый': 'Brown',
    'Лайм': 'Lime',
    'Лиловый': 'Lilac',
    'Лотос': 'Lotus',
    'Мирра': 'Myrrh',
    'Пальмы': 'Palms',
    'Розовый': 'Pink',
    'Светлая фуксия': 'Light Fuchsia',
    'Синий': 'Blue',
    'Фиолетовый': 'Purple',
    'Фуксия': 'Fuchsia',
    'Цитрин - Аметист': 'Citrine - Amethyst',
    'Цитрин - Гранат': 'Citrine - Garnet',
    'Цитрин – Гранат': 'Citrine - Garnet',
    'Чёрный': 'Black',

    // Russian color terms used in product name color suffixes
    'Редкоут / Новый океан': 'Redcoat / New Ocean',
    'Оранжина / Ирландия': 'Orangina / Ireland',
    'Сицилия / Раннее утро': 'Sicily / Early Morning',
    'Ирландия / Жизнь океана': 'Ireland / Ocean Life',
    'Страна грёз / Морская звезда': 'Dreamland / Starfish',
    'Редкоут / Канаты LEAH': 'Redcoat / LEAH Ropes',
    'Сицилия / Лава': 'Sicily / Lava',
    'Ледяное сияние': 'Icy Glow',
    'Изумруд': 'Emerald',
    'Изумрудное сияние': 'Emerald Glow',
    'Изумрудное синие': 'Emerald Blue',
    'Страна грёз / Ледяное сияние': 'Dreamland / Icy Glow',
    'Коралл / Ледяное сияние': 'Coral / Icy Glow',
    'Пальмы / Оранжина': 'Palms / Orangina',
    'Лотос / Фрагола': 'Lotus / Fragola',
    'Мирра / Сицилия': 'Myrrh / Sicily',
    'Коралл / Королевский синий': 'Coral / Royal Blue',
    'Бархатная фуксия': 'Velvet Fuchsia',
    'Бархатный горький апельсин': 'Velvet Bitter Orange',
    'Бархатные сплетни': 'Velvet Gossip',
    'Бархатный кутюр': 'Velvet Couture',
    'Сирень': 'Lilac',

    // SS26 Color / Print translations
    'Геракл': 'Hercules',
    'Афина': 'Athena',
    'Венера': 'Venus',
    'Морской осьминог': 'Marine Octopus',
    'Бороталько': 'Borotalco',
    'Розовый антик': 'Pink Antique',
    'Розовый антик   бороталько': 'Pink Antique / Borotalco',
    'Синий антик': 'Blue Antique',
    'Синий антик   дыхание моря': 'Blue Antique / Seside',
    'Дыхание моря': 'Seside',
    'Пантеон': 'Pantheon',
    'Пантеон   дыхание моря': 'Pantheon / Seside',
    'Олимп': 'Olymp',
    'Олимп   ибридо': 'Olymp / Ibrido',
    'Ибридо': 'Ibrido',
    'Ибридо   лавандовая вуаль': 'Ibrido / Lavanda',
    'Волны эгейского рассвета': 'Blue Agean Waves',
    'Волны эгейского рассвета   ибридо': 'Blue Agean Waves / Ocean Blue',
    'Небесная лазурь': 'Ocean Blue',
    'Белый Халкидики': 'White Halkidiki',
    'Белый Халкидики   фиолетовый': 'White Halkidiki / Violet',
    'Эгейский осьминог': 'Octopus',
    'Мрамор эллады': 'Sculpture',
    'Геракл в морской стихии': 'Blue Hercules',
    'Небесный трезубец': 'Sky Trident',
    'Трезубец заката': 'Pink Trident',
    'Персиковый': 'Peach',
    'Лавандовый': 'Lavanda',
    'Лавандовая вуаль': 'Lavanda',
    'Золотой финик': 'Dattero',
    'Бороталько   золотой финик': 'Borotalco / Dattero',
    'Фиалковая дымка': 'Violet',

    // ──────────────────────────────────────────────
    // CATEGORY NAMES
    // ──────────────────────────────────────────────
    'Купальники': 'Swimwear',
    'Одежда': 'Clothing',
    'Аксессуары': 'Accessories',
    'Спорт': 'Sport',
    'Распродажа': 'Sale',
    'Базовая коллекция': 'Basic Collection',
    'Детская одежда': 'Kids Clothing',
    'Слитные купальники': 'One-piece swimsuits',
    'Бикини верх': 'Bikini tops',
    'Бикини низ': 'Bikini bottoms',
    'Рубашки': 'Shirts',
    'Платья': 'Dresses',
    'Туники': 'Tunics',
    'Головные уборы': 'Hats',
    'Сумки': 'Bags',
    'Украшения': 'Jewelry',
    'Ремни': 'Belts',
    'Спортивные купальники': 'Sports swimsuits',
    'Топы': 'Tops',
    'Худи и свитшоты': 'Hoodies & Sweatshirts',
    'Юбки': 'Skirts',
    'Мужское': 'Menswear',
    'Верх': 'Tops',
    'Низ': 'Bottoms',
    'Новинки': 'New Arrivals',
  };

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.timestamp && Date.now() - data.timestamp < this.CACHE_EXPIRY) {
          this.cache = data.cache || {};
        }
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  private saveCache(): void {
    try {
      const data = {
        cache: this.cache,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  private getCacheKey(text: string): string {
    return text.toLowerCase().trim();
  }

  async translateText(text: string, targetLang: Language = 'en'): Promise<string> {
    if (!text || text.trim() === '') return text;

    // Check static mappings first (before cache)
    const trimmedText = text.trim();
    if (targetLang === 'en' && TranslationService.STATIC_MAPPINGS[trimmedText]) {
      return TranslationService.STATIC_MAPPINGS[trimmedText];
    }

    const cacheKey = this.getCacheKey(text);

    // Check cache
    if (this.cache[cacheKey]?.[targetLang]) {
      return this.cache[cacheKey][targetLang]!;
    }

    try {
      // Use Google Translate free API (no CORS issues from client-side)
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      );

      if (response.ok) {
        const data = await response.json();
        const translatedText = data[0]?.[0]?.[0] || text;

        // Cache the translation
        if (!this.cache[cacheKey]) {
          this.cache[cacheKey] = {};
        }
        this.cache[cacheKey][targetLang] = translatedText;
        this.saveCache();

        return translatedText;
      }
    } catch (error) {
      console.warn('Translation failed, returning original text:', error);
    }

    return text; // Return original text if translation fails
  }
}

const translationService = new TranslationService();

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // English-only version - always default to 'en'
    return 'en';
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // No localStorage saving since language is determined by URL
  }, []);

  // English-only version - no URL-based language switching needed
  useEffect(() => {
    // Keep language fixed to 'en' in English-only version
    setLanguageState('en');
    // Set ready after a brief delay to ensure everything is initialized
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  const translateDynamic = useCallback(async (text: string, targetLang: Language = language): Promise<string> => {
    if (targetLang === 'ru') return text; // No translation needed for Russian

    setIsTranslating(true);
    try {
      const translated = await translationService.translateText(text, targetLang);
      return translated;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Static translations (will be expanded)
  const staticTranslations: Record<string, Record<Language, string>> = {
    // Navigation
    'nav.swimwear': { ru: 'Купальники', en: 'Swimwear' },
    'nav.clothing': { ru: 'Одежда', en: 'Clothing' },
    'nav.sport': { ru: 'Спорт', en: 'Sport' },
    'nav.plussize': { ru: 'Plus size', en: 'Plus size' },
    'nav.accessories': { ru: 'Аксессуары', en: 'Accessories' },
    'nav.basic': { ru: 'Базовая коллекция', en: 'Basic Collection' },
    'nav.cruise': { ru: 'Cruise Collection', en: 'Cruise Collection' },
    'nav.sale': { ru: 'Распродажа', en: 'Sale' },
    'nav.home': { ru: 'Главная', en: 'Home' },
    'nav.about': { ru: 'О нас', en: 'About Us' },
    'nav.contact': { ru: 'Контакты', en: 'Contact' },
    'nav.category': { ru: 'Категория', en: 'Category' },

    // Footer
    'footer.support': { ru: 'Поддержка клиентов', en: 'Customer Support' },
    'footer.contact': { ru: 'Связаться с нами', en: 'Contact Us' },
    'footer.delivery': { ru: 'Доставка', en: 'Delivery' },
    'footer.sizeChart': { ru: 'Размерная сетка', en: 'Size Chart' },
    'footer.returns': { ru: 'Возвраты', en: 'Returns' },
    'footer.information': { ru: 'Информация', en: 'Information' },
    'footer.payment': { ru: 'Оплата', en: 'Payment' },
    'footer.brand': { ru: 'Бренд', en: 'Brand' },
    'footer.catalog': { ru: 'Каталог', en: 'Catalog' },
    'footer.social': { ru: 'Социальные сети', en: 'Social Media' },
    'footer.contacts': { ru: 'Контакты', en: 'Contacts' },
    'footer.offer': { ru: 'Публичная оферта', en: 'Public Offer' },

    // Contact Page
    'contact.phone': { ru: 'Телефон', en: 'Phone' },
    'contact.location': { ru: 'Самовывоз', en: 'Pickup' },
    'contact.wholesale': { ru: 'Для оптовых заказов продукции LÉAH', en: 'For LÉAH wholesale orders' },
    'contact.email': { ru: 'Email', en: 'Email' },

    // Common
    'common.loading': { ru: 'Загрузка...', en: 'Loading...' },
    'common.error': { ru: 'Ошибка', en: 'Error' },
    'common.retry': { ru: 'Повторить', en: 'Retry' },
    'common.close': { ru: 'Закрыть', en: 'Close' },
    'common.save': { ru: 'Сохранить', en: 'Save' },
    'common.cancel': { ru: 'Отмена', en: 'Cancel' },
    'common.search': { ru: 'Поиск', en: 'Search' },
    'common.filter': { ru: 'Фильтр', en: 'Filter' },
    'common.price': { ru: 'Цена', en: 'Price' },
    'common.size': { ru: 'Размер', en: 'Size' },
    'common.color': { ru: 'Цвет', en: 'Color' },
    'common.addToCart': { ru: 'Добавить в корзину', en: 'Add to Cart' },
    'common.cart': { ru: 'Корзина', en: 'Cart' },
    'common.checkout': { ru: 'Оформить заказ', en: 'Checkout' },
    'common.goTo': { ru: 'Перейти', en: 'Go to' },
    'common.quantity': { ru: 'Кол-во', en: 'Quantity' },
    'common.sort': { ru: 'Сортировать', en: 'Sort' },
    'common.showingProducts': { ru: 'Показано {count} товаров', en: 'Showing {count} products' },
    'common.vpnMessage': { ru: 'Пожалуйста, не забудьте отключить VPN', en: 'Please remember to turn off VPN' },
    'common.selectSize': { ru: 'Выберите размер', en: 'Select size' },
    'common.selectColor': { ru: 'Выберите цвет', en: 'Select color' },
    'common.selectedSize': { ru: 'Выбранный размер', en: 'Selected size' },
    'common.selectedColor': { ru: 'Выбранный цвет', en: 'Selected color' },
    'common.priceAscending': { ru: 'Цена: по возрастанию', en: 'Price: Low to High' },
    'common.priceDescending': { ru: 'Цена: по убыванию', en: 'Price: High to Low' },
    'common.pleaseSelectOptions': { ru: 'Пожалуйста, выберите все опции товара (например, размер).', en: 'Please select all product options (e.g., size).' },
    'common.filters': { ru: 'Фильтры', en: 'Filters' },
    'common.all': { ru: 'Все', en: 'All' },
    'common.allCategories': { ru: 'Все категории', en: 'All Categories' },
    'common.clearAll': { ru: 'Очистить все', en: 'Clear All' },
    'common.allSubcategories': { ru: 'Все подкатегории', en: 'All Subcategories' },
    'common.showResults': { ru: 'Показать {count} результатов', en: 'Show {count} results' },

    // Cart translations
    'cart.title': { ru: 'КОРЗИНА', en: 'CART' },
    'cart.titleEn': { ru: 'КОРЗИНА', en: 'CART' },
    'cart.empty': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'cart.emptyEn': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'cart.checkout': { ru: 'ОФОРМИТЬ ЗАКАЗ', en: 'PLACE ORDER' },
    'cart.checkoutEn': { ru: 'ОФОРМИТЬ ЗАКАЗ', en: 'PLACE ORDER' },
    'cart.discount': { ru: 'Скидка', en: 'Discount' },
    'cart.discountEn': { ru: 'Скидка', en: 'Discount' },
    'cart.total': { ru: 'ИТОГО:', en: 'TOTAL:' },
    'cart.totalEn': { ru: 'ИТОГО:', en: 'TOTAL:' },
    'cart.remove': { ru: 'Удалить товар', en: 'Remove item' },
    'cart.removeEn': { ru: 'Удалить товар', en: 'Remove item' },

    // Favorites translations
    'favorites.title': { ru: 'ИЗБРАННОЕ', en: 'FAVORITES' },
    'favorites.titleEn': { ru: 'ИЗБРАННОЕ', en: 'FAVORITES' },
    'favorites.empty': { ru: 'Список избранного пуст.', en: 'Favorites list is empty.' },
    'favorites.emptyEn': { ru: 'Список избранного пуст.', en: 'Favorites list is empty.' },
    'favorites.unlike': { ru: 'Unlike', en: 'Unlike' },
    'favorites.unlikeEn': { ru: 'Unlike', en: 'Unlike' },

    // Product page translations
    'product.addToCart': { ru: 'В КОРЗИНУ', en: 'ADD TO CART' },
    'product.addToCartEn': { ru: 'В КОРЗИНУ', en: 'ADD TO CART' },
    'product.adding': { ru: 'ДОБАВЛЕНИЕ...', en: 'ADDING...' },
    'product.addingEn': { ru: 'ДОБАВЛЕНИЕ...', en: 'ADDING...' },
    'product.parameters': { ru: 'Параметры изделия', en: 'Product Parameters' },
    'product.parametersEn': { ru: 'Параметры изделия', en: 'Product Parameters' },
    'product.delivery': { ru: 'Доставка', en: 'Delivery' },
    'product.deliveryEn': { ru: 'Доставка', en: 'Delivery' },
    'product.returns': { ru: 'Возврат', en: 'Returns' },
    'product.returnsEn': { ru: 'Возврат', en: 'Returns' },
    'product.noDescription': { ru: 'Описание товара отсутствует.', en: 'Product description is missing.' },
    'product.noDescriptionEn': { ru: 'Описание товара отсутствует.', en: 'Product description is missing.' },
    'product.composition': { ru: 'Состав:', en: 'Composition:' },
    'product.compositionEn': { ru: 'Состав:', en: 'Composition:' },
    'product.countryOfOrigin': { ru: 'Страна производства:', en: 'Country of production:' },
    'product.countryOfOriginEn': { ru: 'Страна производства:', en: 'Country of production:' },
    'product.onModel': { ru: 'На модели:', en: 'On model:' },
    'product.onModelEn': { ru: 'На модели:', en: 'On model:' },
    'product.modelParameters': { ru: 'Параметры модели:', en: 'Model parameters:' },
    'product.modelParametersEn': { ru: 'Параметры модели:', en: 'Model parameters:' },
    'product.parametersForSize': { ru: 'Параметры изделия для размера', en: 'Product parameters for size' },
    'product.parametersForSizeEn': { ru: 'Параметры изделия для размера', en: 'Product parameters for size' },

    // Delivery details
    'delivery.withinMKAD': { ru: 'СДЭК Москва: По Москве и в пределах МКАД — 750 ₽', en: 'CDEK Moscow: Within Moscow and MKAD — €8' },
    'delivery.withinMKADEn': { ru: 'СДЭК Москва: По Москве и в пределах МКАД — 750 ₽', en: 'CDEK Moscow: Within Moscow and MKAD — €8' },
    'delivery.outsideMKAD20': { ru: 'За пределами МКАД — 1500 ₽', en: 'Outside MKAD — €16' },
    'delivery.outsideMKAD20En': { ru: 'За пределами МКАД — 1500 ₽', en: 'Outside MKAD — €16' },
    'delivery.outsideMKADOver20': { ru: 'СДЭК РФ: Доставка СДЭК по всей России. Стоимость доставки рассчитывается согласно тарифам компании СДЭК. Срок доставки (без учета времени на формирование заказа) зависит от адреса получателя', en: 'CDEK Russia: CDEK delivery throughout Russia. Delivery cost is calculated according to CDEK company tariffs. Delivery time (excluding order processing time) depends on the recipient\'s address' },
    'delivery.outsideMKADOver20En': { ru: 'СДЭК РФ: Доставка СДЭК по всей России. Стоимость доставки рассчитывается согласно тарифам компании СДЭК. Срок доставки (без учета времени на формирование заказа) зависит от адреса получателя', en: 'CDEK Russia: CDEK delivery throughout Russia. Delivery cost is calculated according to CDEK company tariffs. Delivery time (excluding order processing time) depends on the recipient\'s address' },
    'delivery.international': { ru: 'Самовывоз без примерки: г.Москва, ул. Новая Басманная, д.19стр1', en: 'Pickup without fitting: Moscow, ul. Novaya Basmannaya, 19bld1' },
    'delivery.internationalEn': { ru: 'Самовывоз без примерки: г.Москва, ул. Новая Басманная, д.19стр1', en: 'Pickup without fitting: Moscow, ul. Novaya Basmannaya, 19bld1' },
    'delivery.byPhone': { ru: 'По телефону: +7 (926) 879-28-78', en: 'By phone: +7 (926) 879-28-78' },
    'delivery.byPhoneEn': { ru: 'По телефону: +7 (926) 879-28-78', en: 'By phone: +7 (926) 879-28-78' },
    'delivery.byEmail': { ru: 'По почте: info@leahcation.ru', en: 'By email: info@leahcation.com' },
    'delivery.byEmailEn': { ru: 'По почте: info@leahcation.ru', en: 'By email: info@leahcation.com' },

    // Returns details
    'returns.conditions': { ru: 'Товар должен быть новым, товарный вид полностью сохранен, товар не был использован, отсутствуют признаки деформации и механические повреждения, отсутствуют пятна, затяжки, посторонние запахи; Все вшитые ярлыки, этикетки, пломбы на товаре сохранены и не повреждены, присутствует оригинальная упаковка, а также чеки, подтверждающие покупку. На товары из серебра, украшения и ювелирные изделия, возврат не предусмотрен.', en: 'The product must be new, the appearance fully preserved, the product was not used, there are no signs of deformation and mechanical damage, no stains, snags, foreign odors; All sewn-in labels, tags, seals on the product are preserved and undamaged, original packaging is present, as well as receipts confirming the purchase. Returns are not provided for silver items, jewelry and jewelry products.' },
    'returns.conditionsEn': { ru: 'Товар должен быть новым, товарный вид полностью сохранен, товар не был использован, отсутствуют признаки деформации и механические повреждения, отсутствуют пятна, затяжки, посторонние запахи; Все вшитые ярлыки, этикетки, пломбы на товаре сохранены и не повреждены, присутствует оригинальная упаковка, а также чеки, подтверждающие покупку. На товары из серебра, украшения и ювелирные изделия, возврат не предусмотрен.', en: 'The product must be new, the appearance fully preserved, the product was not used, there are no signs of deformation and mechanical damage, no stains, snags, foreign odors; All sewn-in labels, tags, seals on the product are preserved and undamaged, original packaging is present, as well as receipts confirming the purchase. Returns are not provided for silver items, jewelry and jewelry products.' },
    'returns.toArrange': { ru: 'Для оформления возврата, пожалуйста, свяжитесь с нами:', en: 'To arrange a return, please contact us:' },
    'returns.toArrangeEn': { ru: 'Для оформления возврата, пожалуйста, свяжитесь с нами:', en: 'To arrange a return, please contact us:' },
    'returns.byPhone': { ru: 'По телефону: +7 926 879-28-78', en: 'By phone: +7 926 879-28-78' },
    'returns.byPhoneEn': { ru: 'По телефону: +7 926 879-28-78', en: 'By phone: +7 926 879-28-78' },
    'returns.byEmail': { ru: 'По почте: info@leahswim.com', en: 'By email: info@leahswim.com' },
    'returns.byEmailEn': { ru: 'По почте: info@leahswim.com', en: 'By email: info@leahswim.com' },
    'returns.law': { ru: 'В соответствии с Законом о защите прав потребителей No2300-1 от 1992 г. (далее ЗоЗПП), купальники возврату или обмену не подлежат.', en: 'In accordance with the Consumer Protection Law No2300-1 of 1992 (hereinafter referred to as the Consumer Protection Law), swimwear is not subject to return or exchange.' },
    'returns.lawEn': { ru: 'В соответствии с Законом о защите прав потребителей No2300-1 от 1992 г. (далее ЗоЗПП), купальники возврату или обмену не подлежат.', en: 'In accordance with the Consumer Protection Law No2300-1 of 1992 (hereinafter referred to as the Consumer Protection Law), swimwear is not subject to return or exchange.' },

    // Checkout page translations
    'checkout.title': { ru: 'Ваш заказ', en: 'Your Order' },
    'checkout.titleEn': { ru: 'Ваш заказ', en: 'Your Order' },
    'checkout.emptyCart': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'checkout.emptyCartEn': { ru: 'Ваша корзина пуста.', en: 'Your cart is empty.' },
    'checkout.quantity': { ru: 'Quantity:', en: 'Quantity:' },
    'checkout.quantityEn': { ru: 'Quantity:', en: 'Quantity:' },
    'checkout.subtotal': { ru: 'Промежуточный итог', en: 'Subtotal' },
    'checkout.subtotalEn': { ru: 'Промежуточный итог', en: 'Subtotal' },
    'checkout.delivery': { ru: 'Доставка', en: 'Delivery' },
    'checkout.deliveryEn': { ru: 'Доставка', en: 'Delivery' },
    'checkout.free': { ru: 'Бесплатно', en: 'Free' },
    'checkout.freeEn': { ru: 'Бесплатно', en: 'Free' },
    'checkout.totalToPay': { ru: 'Итого к оплате', en: 'Total to Pay' },
    'checkout.totalToPayEn': { ru: 'Итого к оплате', en: 'Total to Pay' },
    'checkout.confirmAndPay': { ru: 'Подтвердить и оплатить', en: 'Confirm and Pay' },
    'checkout.confirmAndPayEn': { ru: 'Подтвердить и оплатить', en: 'Confirm and Pay' },
    'checkout.processing': { ru: 'Обработка...', en: 'Processing...' },
    'checkout.processingEn': { ru: 'Обработка...', en: 'Processing...' },
    'checkout.paymentMethod': { ru: 'Оплата банковской картой через CloudPayments', en: 'Payment by bank card through CloudPayments' },
    'checkout.paymentMethodEn': { ru: 'Оплата банковской картой через CloudPayments', en: 'Payment by bank card through CloudPayments' },
    'checkout.agreeTerms': { ru: 'Нажимая «Подтвердить и оплатить», вы соглашаетесь с нашими', en: 'By clicking "Confirm and Pay", you agree to our' },
    'checkout.agreeTermsEn': { ru: 'Нажимая «Подтвердить и оплатить», вы соглашаетесь с нашими', en: 'By clicking "Confirm and Pay", you agree to our' },
    'checkout.termsOfService': { ru: 'Условиями обслуживания', en: 'Terms of Service' },
    'checkout.termsOfServiceEn': { ru: 'Условиями обслуживания', en: 'Terms of Service' },
    'checkout.and': { ru: 'и', en: 'and' },
    'checkout.andEn': { ru: 'и', en: 'and' },
    'checkout.privacyPolicy': { ru: 'Политикой конфиденциальности', en: 'Privacy Policy' },
    'checkout.privacyPolicyEn': { ru: 'Политикой конфиденциальности', en: 'Privacy Policy' },

    // Form fields
    'form.firstName': { ru: 'Имя', en: 'First Name' },
    'form.firstNameEn': { ru: 'Имя', en: 'First Name' },
    'form.lastName': { ru: 'Фамилия', en: 'Last Name' },
    'form.lastNameEn': { ru: 'Фамилия', en: 'Last Name' },
    'form.email': { ru: 'Email', en: 'Email' },
    'form.emailEn': { ru: 'Email', en: 'Email' },
    'form.phone': { ru: 'Телефон', en: 'Phone' },
    'form.phoneEn': { ru: 'Телефон', en: 'Phone' },
    'form.address': { ru: 'Адрес (Улица, дом, квартира)', en: 'Address (Street, house, apartment)' },
    'form.addressEn': { ru: 'Адрес (Улица, дом, квартира)', en: 'Address (Street, house, apartment)' },
    'form.city': { ru: 'Город', en: 'City' },
    'form.cityEn': { ru: 'Город', en: 'City' },
    'form.postcode': { ru: 'Почтовый индекс', en: 'Postal Code' },
    'form.postcodeEn': { ru: 'Почтовый индекс', en: 'Postal Code' },
    'form.country': { ru: 'Страна', en: 'Country' },
    'form.countryEn': { ru: 'Страна', en: 'Country' },
    'form.deliveryOption': { ru: 'Доставка', en: 'Delivery' },
    'form.deliveryOptionEn': { ru: 'Доставка', en: 'Delivery' },

    // Delivery options
    'delivery.withinMKADFree': { ru: 'В пределах МКАД - Бесплатно', en: 'Within MKAD - Free' },
    'delivery.withinMKADFreeEn': { ru: 'В пределах МКАД - Бесплатно', en: 'Within MKAD - Free' },
    'delivery.outsideMKAD20km': { ru: 'За пределами МКАД (до 20км)', en: 'Outside MKAD (up to 20km)' },
    'delivery.outsideMKAD20kmEn': { ru: 'За пределами МКАД (до 20км)', en: 'Outside MKAD (up to 20km)' },
    'delivery.outsideMKADOver20km': { ru: 'За пределами МКАД (после 20 км)', en: 'Outside MKAD (over 20km)' },
    'delivery.outsideMKADOver20kmEn': { ru: 'За пределами МКАД (после 20 км)', en: 'Outside MKAD (over 20km)' },

    // Related products
    'related.title': { ru: 'Вам также может понравиться', en: 'You might also like' },
    'related.titleEn': { ru: 'Вам также может понравиться', en: 'You might also like' },
  };

  const t = useCallback((key: string, fallback?: string): string => {
    const translation = staticTranslations[key]?.[language];
    return translation || fallback || key;
  }, [language]);

  const value: TranslationContextType = {
    language,
    setLanguage,
    t,
    translateDynamic,
    isTranslating,
    availableLanguages: ['ru', 'en'],
    isReady
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Hook for dynamic content translation
export const useDynamicTranslation = () => {
  const { translateDynamic, isTranslating, language } = useTranslation();

  const [cache, setCache] = useState<Record<string, string>>({});

  const translate = useCallback(async (text: string): Promise<string> => {
    if (language === 'ru') return text;

    const cacheKey = `${text}_${language}`;
    if (cache[cacheKey]) return cache[cacheKey];

    const translated = await translateDynamic(text, language);
    setCache(prev => ({ ...prev, [cacheKey]: translated }));
    return translated;
  }, [translateDynamic, language, cache]);

  return { translate, isTranslating };
}; 