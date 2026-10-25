import { Context } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";

export const getWallet = async (ctx: Context) => {
  try {
    const sesion = ctx.state.usuario as { id?: number; Id_Usuario?: number } | undefined;
    const userId = sesion?.Id_Usuario ?? sesion?.id;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "No autorizado" };
      return;
    }

    // Buscar o crear wallet
    let result = await client.query(
      "SELECT * FROM wallets WHERE user_id = ?",
      [userId]
    );

    if (result.length === 0) {
      await client.execute(
        "INSERT INTO wallets (user_id, balance) VALUES (?, 0)",
        [userId]
      );
      result = await client.query(
        "SELECT * FROM wallets WHERE user_id = ?",
        [userId]
      );
    }

    const wallet = result[0];

    const transactions = await client.query(
      "SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20",
      [wallet.id]
    );

    ctx.response.status = 200;
    ctx.response.body = {
      balance: parseFloat(wallet.balance),
      transactions,
    };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener billetera", error: String(error) };
  }
};

export const deposit = async (ctx: Context) => {
  try {
    const sesion = ctx.state.usuario as { id?: number; Id_Usuario?: number } | undefined;
    const userId = sesion?.Id_Usuario ?? sesion?.id;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "No autorizado" };
      return;
    }

    const body = await ctx.request.body.json();
    const amount = parseFloat(body.amount);

    if (!amount || amount <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Monto inválido" };
      return;
    }

    let result = await client.query(
      "SELECT * FROM wallets WHERE user_id = ?",
      [userId]
    );

    if (result.length === 0) {
      await client.execute(
        "INSERT INTO wallets (user_id, balance) VALUES (?, 0)",
        [userId]
      );
      result = await client.query(
        "SELECT * FROM wallets WHERE user_id = ?",
        [userId]
      );
    }

    const wallet = result[0];
    const newBalance = parseFloat(wallet.balance) + amount;

    await client.execute(
      "UPDATE wallets SET balance = ? WHERE id = ?",
      [newBalance, wallet.id]
    );

    await client.execute(
      "INSERT INTO transactions (wallet_id, type, amount, description) VALUES (?, ?, ?, ?)",
      [wallet.id, "deposit", amount, "Recarga de saldo"]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Recarga exitosa", balance: newBalance };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al recargar", error: String(error) };
  }
};

export const withdraw = async (ctx: Context) => {
  try {
    const sesion = ctx.state.usuario as { id?: number; Id_Usuario?: number } | undefined;
    const userId = sesion?.Id_Usuario ?? sesion?.id;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "No autorizado" };
      return;
    }

    const body = await ctx.request.body.json();
    const amount = parseFloat(body.amount);

    if (!amount || amount <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Monto inválido" };
      return;
    }

    const result = await client.query(
      "SELECT * FROM wallets WHERE user_id = ?",
      [userId]
    );

    if (result.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "No tienes billetera" };
      return;
    }

    const wallet = result[0];

    if (parseFloat(wallet.balance) < amount) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Saldo insuficiente" };
      return;
    }

    const newBalance = parseFloat(wallet.balance) - amount;

    await client.execute(
      "UPDATE wallets SET balance = ? WHERE id = ?",
      [newBalance, wallet.id]
    );

    await client.execute(
      "INSERT INTO transactions (wallet_id, type, amount, description) VALUES (?, ?, ?, ?)",
      [wallet.id, "withdraw", amount, "Retiro de saldo"]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Retiro exitoso", balance: newBalance };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al retirar", error: String(error) };
  }
};