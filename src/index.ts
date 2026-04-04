import "dotenv/config";
import app from "./server";
import { seedAdmins } from "./seed/admin.seed";

const PORT = parseInt(process.env.PORT || "4000");

async function start() {
  try {
    await seedAdmins(); // 👈 aquí ocurre el seed automático

    app.listen(PORT, () => {
      console.log(`🚀 Server corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar:", error);
    process.exit(1);
  }
}

start();