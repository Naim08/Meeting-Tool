import { useState, useEffect, useMemo } from "react";
import { Bot, Lock } from "lucide-react";
import { getServerRoot } from "../../lib/utils";
import { SectionHeader } from "./shared";
import { cn } from "@/lib/utils";

const PRIMARY_LABEL_KEY = "aiModelPrimaryLabel";
const SECONDARY_LABEL_KEY = "aiModelSecondaryLabel";

const SONNET_HINT = /sonnet\s*4\.?5/i;
const GPT5_HINT = /gpt[-\s]?5/i;

const safeStringify = (value) => JSON.stringify(value ?? "");

const AIModelSettings = ({
  model,
  setModel,
  resetChatSessions,
  apiKeyValidity,
  comparisonEnabled,
  setComparisonEnabled,
  primaryModel,
  setPrimaryModel,
  secondaryModel,
  setSecondaryModel,
}) => {
  const [availableModels, setAvailableModels] = useState([]);
  const [premiumModels, setPremiumModels] = useState([]);

  const hasRequiredApiKey = (aiModel) => {
    if (aiModel.isPremium) {
      if (aiModel.company.toLowerCase().includes("openai")) {
        return apiKeyValidity?.openai || false;
      }
      if (aiModel.company.toLowerCase().includes("anthropic")) {
        return apiKeyValidity?.anthropic || false;
      }
    }
    return true;
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${getServerRoot()}/api/models`);
        const models = await response.json();
        setAvailableModels(models);
      } catch (error) {
        console.error("Failed to fetch AI models:", error);
      }
    };

    const fetchPremiumModels = async () => {
      try {
        const response = await fetch(`${getServerRoot()}/api/models/premium`);
        const models = await response.json();
        setPremiumModels(models);
      } catch (error) {
        console.error("Failed to fetch premium AI models:", error);
      }
    };

    fetchPremiumModels();
    fetchModels();
  }, []);

  const allModels = useMemo(
    () => [...availableModels, ...premiumModels],
    [availableModels, premiumModels]
  );

  const findModelById = (id) =>
    allModels.find((candidate) => candidate.modelId === id) ?? null;

  const findSelectableModel = (excludeId) =>
    allModels.find(
      (candidate) =>
        hasRequiredApiKey(candidate) &&
        (!excludeId || candidate.modelId !== excludeId)
    ) ?? null;

  const findPreferredModel = (hint, excludeId) =>
    allModels.find((candidate) => {
      if (excludeId && candidate.modelId === excludeId) {
        return false;
      }
      if (!hasRequiredApiKey(candidate)) {
        return false;
      }
      const target = `${candidate.name ?? ""} ${candidate.modelId ?? ""}`;
      return hint.test(target);
    }) ?? null;

  const applySelection = (
    setter,
    currentId,
    nextModel,
    labelKey,
    { reset = true } = {}
  ) => {
    if (!nextModel || nextModel.modelId === currentId) {
      return false;
    }
    setter(nextModel.modelId);
    if (labelKey) {
      window.localStorage.setItem(labelKey, safeStringify(nextModel.name));
    }
    if (reset) {
      resetChatSessions?.();
    }
    return true;
  };

  useEffect(() => {
    if (!comparisonEnabled) {
      const currentModel =
        findModelById(model) ??
        findModelById(primaryModel) ??
        findSelectableModel();
      if (!currentModel) {
        return;
      }

      const changedPrimary = applySelection(
        setPrimaryModel,
        primaryModel,
        currentModel,
        PRIMARY_LABEL_KEY,
        { reset: false }
      );
      const changedSingle = applySelection(
        setModel,
        model,
        currentModel,
        PRIMARY_LABEL_KEY,
        { reset: false }
      );

      if ((changedPrimary || changedSingle) && comparisonEnabled) {
        resetChatSessions?.();
      }
      return;
    }

    const primaryCandidate =
      findModelById(primaryModel) ??
      findPreferredModel(SONNET_HINT) ??
      findModelById(model) ??
      findSelectableModel();

    if (primaryCandidate) {
      applySelection(
        setPrimaryModel,
        primaryModel,
        primaryCandidate,
        PRIMARY_LABEL_KEY,
        { reset: false }
      );
      applySelection(
        setModel,
        model,
        primaryCandidate,
        PRIMARY_LABEL_KEY,
        { reset: false }
      );
    }

    const secondaryCandidate =
      findModelById(secondaryModel) ??
      findPreferredModel(GPT5_HINT, primaryCandidate?.modelId) ??
      findSelectableModel(primaryCandidate?.modelId);

    if (secondaryCandidate) {
      applySelection(
        setSecondaryModel,
        secondaryModel,
        secondaryCandidate,
        SECONDARY_LABEL_KEY,
        { reset: false }
      );
    }

    if (
      primaryCandidate &&
      secondaryCandidate &&
      primaryCandidate.modelId === secondaryCandidate.modelId
    ) {
      const alternate = findSelectableModel(primaryCandidate.modelId);
      if (alternate) {
        applySelection(
          setSecondaryModel,
          secondaryCandidate.modelId,
          alternate,
          SECONDARY_LABEL_KEY,
          { reset: false }
        );
      }
    }
  }, [
    comparisonEnabled,
    model,
    primaryModel,
    secondaryModel,
    setModel,
    setPrimaryModel,
    setSecondaryModel,
    resetChatSessions,
    allModels,
  ]);

  useEffect(() => {
    if (!allModels.length) {
      return;
    }

    const enforceValidity = (selectedId, setter, labelKey) => {
      if (!selectedId) {
        return false;
      }
      const selectedModel = findModelById(selectedId);
      if (!selectedModel || !hasRequiredApiKey(selectedModel)) {
        const fallback = findSelectableModel();
        if (fallback) {
          return applySelection(setter, selectedId, fallback, labelKey, {
            reset: false,
          });
        }
      }
      return false;
    };

    if (!comparisonEnabled) {
      const changed =
        enforceValidity(model, setModel, PRIMARY_LABEL_KEY) ||
        enforceValidity(primaryModel, setPrimaryModel, PRIMARY_LABEL_KEY);
      if (changed) {
        resetChatSessions?.();
      }
      return;
    }

    const primaryChanged = enforceValidity(
      primaryModel,
      setPrimaryModel,
      PRIMARY_LABEL_KEY
    );
    const secondaryChanged = enforceValidity(
      secondaryModel,
      setSecondaryModel,
      SECONDARY_LABEL_KEY
    );

    if (primaryChanged || secondaryChanged) {
      resetChatSessions?.();
    }
  }, [
    allModels,
    apiKeyValidity,
    comparisonEnabled,
    model,
    primaryModel,
    secondaryModel,
    setModel,
    setPrimaryModel,
    setSecondaryModel,
    resetChatSessions,
  ]);

  const handleSingleSelect = (aiModel) => {
    const changedPrimary = applySelection(
      setPrimaryModel,
      primaryModel,
      aiModel,
      PRIMARY_LABEL_KEY,
      { reset: false }
    );
    const changedSingle = applySelection(
      setModel,
      model,
      aiModel,
      PRIMARY_LABEL_KEY,
      { reset: false }
    );
    if (changedPrimary || changedSingle) {
      resetChatSessions?.();
    }
  };

  const handlePrimarySelect = (aiModel) => {
    const updatedPrimary = applySelection(
      setPrimaryModel,
      primaryModel,
      aiModel,
      PRIMARY_LABEL_KEY,
      { reset: false }
    );
    const updatedSingle = applySelection(
      setModel,
      model,
      aiModel,
      PRIMARY_LABEL_KEY,
      { reset: false }
    );
    let updatedSecondary = false;
    if (secondaryModel === aiModel.modelId) {
      const alternate = findSelectableModel(aiModel.modelId);
      if (alternate) {
        updatedSecondary = applySelection(
          setSecondaryModel,
          secondaryModel,
          alternate,
          SECONDARY_LABEL_KEY,
          { reset: false }
        );
      }
    }
    if (updatedPrimary || updatedSingle || updatedSecondary) {
      resetChatSessions?.();
    }
  };

  const handleSecondarySelect = (aiModel) => {
    const changed = applySelection(
      setSecondaryModel,
      secondaryModel,
      aiModel,
      SECONDARY_LABEL_KEY,
      { reset: false }
    );
    if (changed) {
      resetChatSessions?.();
    }
  };

  const handleComparisonToggle = (event) => {
    const nextValue = event.target.checked;
    if (nextValue === comparisonEnabled) {
      return;
    }
    setComparisonEnabled(nextValue);
    if (!nextValue) {
      const primaryCandidate =
        findModelById(primaryModel) ??
        findModelById(model) ??
        findSelectableModel();
      if (primaryCandidate) {
        applySelection(
          setModel,
          model,
          primaryCandidate,
          PRIMARY_LABEL_KEY,
          { reset: false }
        );
        applySelection(
          setPrimaryModel,
          primaryModel,
          primaryCandidate,
          PRIMARY_LABEL_KEY,
          { reset: false }
        );
      }
      window.localStorage.setItem(SECONDARY_LABEL_KEY, safeStringify(""));
    }
    resetChatSessions?.();
  };

  const renderModelCard = (aiModel, selectedId, onSelect, groupKey) => {
    const hasApiKey = hasRequiredApiKey(aiModel);
    const isDisabled = aiModel.isPremium && !hasApiKey;
    const isSelected = selectedId === aiModel.modelId && !isDisabled;
    const inputId = `${groupKey}-${aiModel.modelId}`;

    return (
      <label
        key={aiModel.modelId}
        htmlFor={inputId}
        className={cn(
          "block rounded-lg border p-4 text-sm shadow-md transition-all",
          isDisabled
            ? "cursor-not-allowed border-border/60 bg-muted/70 opacity-60 dark:border-gray-800 dark:bg-gray-900/50"
            : "cursor-pointer border-border bg-card hover:border-primary/40 hover:bg-muted dark:border-gray-800 dark:bg-gray-800/60",
          isSelected &&
            "border-primary ring-1 ring-primary/60 bg-muted dark:border-purple-500/70 dark:ring-purple-500/60 dark:bg-gray-800/80"
        )}
      >
        <div className="flex items-start">
          <div
            className={cn(
              "mr-3 mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
              isSelected
                ? "border-primary bg-primary"
                : "border-border dark:border-gray-600"
            )}
          >
            {isSelected && (
              <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-muted-foreground">
                {aiModel.company}
              </p>
            </div>
            <p className="mt-1 font-semibold text-foreground">{aiModel.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {aiModel.description}
            </p>
            {isDisabled && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-orange-400">
                <Lock className="h-3 w-3" />
                Requires {aiModel.company} API key
              </p>
            )}
          </div>
        </div>

        <input
          type="radio"
          name={`AIModel-${groupKey}`}
          value={aiModel.modelId}
          id={inputId}
          className="sr-only"
          onChange={() => {
            if (!isDisabled) {
              onSelect(aiModel);
            }
          }}
          checked={isSelected}
          disabled={isDisabled}
        />
      </label>
    );
  };

  const renderModelGroups = (selectedId, onSelect, groupKey) => (
    <div className="space-y-6">
      {availableModels.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-medium text-foreground">
            Standard Models
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {availableModels.map((aiModel) =>
              renderModelCard(aiModel, selectedId, onSelect, groupKey)
            )}
          </div>
        </div>
      )}

      {premiumModels.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-medium text-foreground">
              Premium Models
            </h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            These models require your own API keys and will charge your account
            directly.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {premiumModels.map((aiModel) =>
              renderModelCard(aiModel, selectedId, onSelect, groupKey)
            )}
          </div>

          {!apiKeyValidity?.openai && !apiKeyValidity?.anthropic && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-orange-800/30 dark:bg-orange-900/20 dark:text-orange-100">
              <div className="flex items-start">
                <Lock className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-orange-400" />
                <div>
                  <h4 className="text-sm font-medium text-amber-700 dark:text-orange-200">
                    API Keys Required
                  </h4>
                  <p className="mt-1 text-sm text-amber-700/80 dark:text-orange-100">
                    To use premium models, provide your API keys in the API Keys
                    section above. This allows you to access advanced models
                    using your own quota.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const selectedSingleModelId = model || primaryModel;
  const showDuplicateWarning =
    comparisonEnabled &&
    primaryModel &&
    secondaryModel &&
    primaryModel === secondaryModel;

  return (
    <section>
      <SectionHeader
        icon={Bot}
        title="AI Model"
        description="Changing this will reset your current interview session"
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 p-4 dark:border-gray-800 dark:bg-gray-900/40 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Compare models
            </h3>
            <p className="text-sm text-muted-foreground">
              Enable side-by-side answers from two assistants.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={comparisonEnabled}
              onChange={handleComparisonToggle}
            />
            Dual responses
          </label>
        </div>

        {!comparisonEnabled &&
          renderModelGroups(selectedSingleModelId, handleSingleSelect, "single")}

        {comparisonEnabled && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Primary response
                </h3>
                <p className="text-sm text-muted-foreground">
                  This model powers the default assistant.
                </p>
              </div>
              {renderModelGroups(
                primaryModel || selectedSingleModelId,
                handlePrimarySelect,
                "primary"
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Secondary response
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a second model to compare side-by-side.
                </p>
              </div>
              {renderModelGroups(
                secondaryModel,
                handleSecondarySelect,
                "secondary"
              )}
            </div>

            {showDuplicateWarning && (
              <p className="text-xs font-medium text-amber-600 dark:text-orange-300">
                Select two different models to compare their answers.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AIModelSettings;
