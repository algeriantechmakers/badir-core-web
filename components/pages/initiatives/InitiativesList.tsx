"use client";

import { useEffect, useMemo, useState } from "react";
import {
  InitiativeCard as InitiativeCardType,
  InitiativeFilters,
  InitiativeService,
} from "@/services/initiatives";
import { CategoryCard } from "@/services/categories";
import InitiativeCard from "@/components/pages/InitiativeCard";
import SearchInput from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import PaginationControls from "@/components/PaginationControls";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
import api from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginatedResponse } from "@/types/Pagination";
import AppButton from "@/components/AppButton";
import {
  organizerTypeOptions,
  statusOptions,
  targetAudienceOptions,
} from "@/data/statics";
import Image from "next/image";

interface InitiativesListProps {
  initialData: PaginatedResponse<InitiativeCardType>;
  categories: CategoryCard[];
  isOrg?: boolean;
  isOrgVerified?: boolean;
  userId?: string;
}

export default function InitiativesList({
  initialData,
  categories,
  isOrg = false,
  isOrgVerified = false,
  userId,
}: InitiativesListProps) {
  const [initiatives, setInitiatives] =
    useState<PaginatedResponse<InitiativeCardType>>(initialData);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<InitiativeFilters>({});
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  const categoryOptions = useMemo(() => {
    return [
      { value: "all", label: "جميع الفئات" },
      ...categories.map((cat) => ({
        value: cat.id.toString(),
        label: cat.nameAr,
      })),
    ];
  }, [categories]);

  const fetchInitiatives = async (
    newFilters: InitiativeFilters,
    page: number = 1,
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (newFilters.search) params.append("search", newFilters.search);
      if (newFilters.categoryId)
        params.append("categoryId", newFilters.categoryId.toString());
      if (newFilters.targetAudience)
        params.append("targetAudience", newFilters.targetAudience);
      if (newFilters.status) params.append("status", newFilters.status);
      if (newFilters.organizerType)
        params.append("organizerType", newFilters.organizerType);
      if (newFilters.hasAvailableSpots)
        params.append("hasAvailableSpots", "true");

      params.append("page", page.toString());
      params.append("limit", "12");

      const response = await api.get(
        `${InitiativeService.API_PATH}?${params.toString()}`,
      );
      const data = response.data;

      if (data.success) {
        setInitiatives(data.data);
      }
    } catch (error) {
      console.error("Error fetching initiatives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextFilters = {
      ...filters,
      search: debouncedSearch || undefined,
    };

    if ((filters.search || "") === debouncedSearch) {
      return;
    }

    setFilters(nextFilters);
    fetchInitiatives(nextFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Handle filter changes
  const handleFilterChange = (key: keyof InitiativeFilters, value: string) => {
    const newFilters = { ...filters };

    if (value === "all" || value === "") {
      delete newFilters[key];
    } else {
      if (key === "categoryId") {
        newFilters[key] = value;
      } else if (key === "hasAvailableSpots") {
        newFilters[key] = value === "true";
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newFilters as any)[key] = value;
      }
    }

    setFilters(newFilters);
    fetchInitiatives(
      { ...newFilters, search: debouncedSearch || undefined },
      1,
    );
  };

  const handlePageChange = (page: number) => {
    fetchInitiatives(
      { ...filters, search: debouncedSearch || undefined },
      page,
    );
  };

  const handleClear = () => {
    setSearchValue("");
    setDebouncedSearch("");
    setFilters({});
    fetchInitiatives({}, 1);
  };

  const hasActiveFilters =
    searchValue !== "" || Object.keys(filters).length > 0;

  return (
    <div className="bg-neutrals-100 min-h-screen" dir="rtl">
      <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-primary-md text-neutrals-700 mb-4 font-bold">
            مبادراتنا الحالية
          </h1>
        </div>

        {/* Filters Section */}
        <Card className="mb-8 border-none bg-transparent shadow-none">
          <CardContent className="p-4">
            {/* Search */}
            <div className="flex-center mb-4 max-w-full gap-4 max-sm:flex-wrap sm:justify-center">
              <SearchInput
                value={searchValue}
                onChange={setSearchValue}
                placeholder="ابحث في المبادرات..."
                className="w-full"
              />
              <AppButton
                type="outline"
                border="rounded"
                size="sm"
                onClick={handleClear}
                disabled={!hasActiveFilters}
                icon={<X className="h-4 w-4" />}
              >
                مسح
              </AppButton>
              {(!isOrg || (isOrg && isOrgVerified)) && (
                <AppButton
                  type="primary"
                  url="/initiatives/new"
                  icon={
                    <Image
                      src="/images/icons/plus.svg"
                      alt="Plus"
                      width={16}
                      height={16}
                    />
                  }
                  size="sm"
                >
                  مبادرة جديدة
                </AppButton>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Category Filter */}
              <FilterSelect
                value={filters.categoryId?.toString() || "all"}
                onChange={(value) => handleFilterChange("categoryId", value)}
                options={categoryOptions}
                placeholder="فئة المبادرة"
              />

              {/* Target Audience Filter */}
              <FilterSelect
                value={filters.targetAudience || "both"}
                onChange={(value) =>
                  handleFilterChange("targetAudience", value)
                }
                options={targetAudienceOptions}
                placeholder="الجمهور المستهدف"
              />

              {/* Status Filter */}
              <FilterSelect
                value={filters.status || "all"}
                onChange={(value) => handleFilterChange("status", value)}
                options={statusOptions}
                placeholder="حالة المبادرة"
              />

              {/* Organizer Type Filter */}
              <FilterSelect
                value={filters.organizerType || "all"}
                onChange={(value) => handleFilterChange("organizerType", value)}
                options={organizerTypeOptions}
                placeholder="نوع المُنظِّم"
              />
            </div>

            {/* Additional Filters */}
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  id="hasAvailableSpots"
                  name="hasAvailableSpots"
                  checked={filters.hasAvailableSpots || false}
                  onCheckedChange={(checked) =>
                    handleFilterChange(
                      "hasAvailableSpots",
                      checked ? "true" : "",
                    )
                  }
                  className="data-[state=checked]:bg-secondary-500 data-[state=checked]:border-secondary-500 border-neutrals-500"
                />
                <span className="text-neutrals-600 text-sm">متاح للانضمام</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-neutrals-600">
            <span className="font-medium">{initiatives.pagination.total}</span>{" "}
            {initiatives.data.length > 1 ? "مبادرات" : "مبادرة"}
            {filters.search && (
              <span className="mr-2">
                • نتائج البحث عن &quot;{filters.search}&quot;
              </span>
            )}
          </div>

          {loading && (
            <div className="text-neutrals-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري التحميل...</span>
            </div>
          )}
        </div>

        {/* Initiatives Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {initiatives.data.map((initiative) => (
            <div key={initiative.id} className="h-full">
              <InitiativeCard
                mode="browse"
                initiative={initiative}
                userId={userId}
              />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {initiatives.data.length === 0 && !loading && (
          <div className="py-12 text-center">
            <div className="mb-4">
              <div className="bg-neutrals-200 mx-auto flex h-24 w-24 items-center justify-center rounded-full">
                <span className="text-neutrals-400 text-2xl">🔍</span>
              </div>
            </div>
            <h3 className="text-neutrals-600 mb-2 text-xl font-semibold">
              لا توجد مبادرات
            </h3>
            <p className="text-neutrals-500">
              لم نتمكن من العثور على مبادرات تطابق المعايير المحددة
            </p>
          </div>
        )}

        {/* Pagination */}
        {initiatives.pagination.totalPages > 1 && (
          <PaginationControls
            currentPage={initiatives.pagination.page}
            totalPages={initiatives.pagination.totalPages}
            hasNext={initiatives.pagination.hasNext}
            hasPrev={initiatives.pagination.hasPrev}
            onPageChange={handlePageChange}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}
