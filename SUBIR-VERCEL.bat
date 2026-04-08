@echo off
chcp 65001 >nul
echo ========================================
echo   Subindo para o Vercel...
echo ========================================
echo.

:: Adiciona o Git ao PATH desta sessão
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"

:: Verifica se há mudanças
git status --short
echo.

git add .

:: Pede uma mensagem de commit
set /p MSG="Descreva a alteracao (ou pressione Enter para usar 'Atualização'): "
if "%MSG%"=="" set MSG=Atualizacao

git commit -m "%MSG%"
git push

echo.
echo ========================================
if %ERRORLEVEL%==0 (
    echo   SUCESSO! Site atualizado no Vercel!
    echo   Aguarde ~30 segundos e atualize o site.
) else (
    echo   Nenhuma alteracao nova para subir.
    echo   O site ja esta atualizado!
)
echo ========================================
echo.
pause
