import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Async Thunk: Fetch Configuration
export const fetchConfig = createAsyncThunk(
  "config/fetchConfig",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/config");
      console.log("[REDUX] Config Loaded:", data);
      return data;
    } catch (error) {
      console.error("[REDUX] Config Fetch Failed:", error);
      return rejectWithValue(error.response?.data || "Config fetch failed");
    }
  }
);

const initialState = {
  otpTestMode: false,
  paymentTestMode: true, // Safer default (Mock Mode)
  shippingMode: "real",
  loading: true,
  error: null,
};

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.otpTestMode = action.payload.otpTestMode;
        state.paymentTestMode = action.payload.paymentTestMode;
        state.shippingMode = action.payload.shippingMode;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectConfig = (state) => state.config;

export default configSlice.reducer;
